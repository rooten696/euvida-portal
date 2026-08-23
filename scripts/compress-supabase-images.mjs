import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env.local');

if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const deleteOld = args.has('--delete-old');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const minBytesArg = process.argv.find((arg) => arg.startsWith('--min-bytes='));
const typesArg = process.argv.find((arg) => arg.startsWith('--types='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 25;
const minBytes = minBytesArg ? Number(minBytesArg.split('=')[1]) : 500 * 1024;
const wantedTypes = new Set((typesArg ? typesArg.split('=')[1] : 'articles,regions,countries').split(','));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET ?? 'article-images';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const storageHost = new URL(supabaseUrl).hostname;
const storageMarker = `/storage/v1/object/public/${bucket}/`;

function isSupabaseImageUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname === storageHost && url.pathname.includes(storageMarker);
  } catch {
    return false;
  }
}

function storagePathFromPublicUrl(value) {
  const url = new URL(value);
  const markerIndex = url.pathname.indexOf(storageMarker);
  return decodeURIComponent(url.pathname.slice(markerIndex + storageMarker.length));
}

function safePathSegment(value) {
  return String(value || 'item')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'item';
}

async function optimizeImage(buffer) {
  return sharp(buffer, { animated: false })
    .rotate()
    .resize({
      width: 1920,
      height: 1920,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
}

async function loadRows() {
  const datasets = [];

  if (wantedTypes.has('articles')) {
    const { data, error } = await supabase
      .from('articles')
      .select('id, slug, image_url')
      .not('image_url', 'is', null)
      .order('created_at', { ascending: true });
    if (error) throw error;
    datasets.push(...data.map((row) => ({ type: 'articles', table: 'articles', label: row.slug, ...row })));
  }

  if (wantedTypes.has('regions')) {
    const { data, error } = await supabase
      .from('regions')
      .select('id, name, image_url')
      .not('image_url', 'is', null)
      .order('name', { ascending: true });
    if (error) throw error;
    datasets.push(...data.map((row) => ({ type: 'regions', table: 'regions', label: row.name, ...row })));
  }

  if (wantedTypes.has('countries')) {
    const { data, error } = await supabase
      .from('countries')
      .select('id, name, image_url')
      .not('image_url', 'is', null)
      .order('id', { ascending: true });
    if (error) throw error;
    datasets.push(...data.map((row) => ({ type: 'countries', table: 'countries', label: row.name || row.id, ...row })));
  }

  return datasets.filter((row) => isSupabaseImageUrl(row.image_url));
}

async function processRow(row, index) {
  const response = await fetch(row.image_url);
  if (!response.ok) {
    return { status: 'error', reason: `HTTP ${response.status}` };
  }

  const sourceBuffer = Buffer.from(await response.arrayBuffer());
  const oldPath = storagePathFromPublicUrl(row.image_url);

  if (sourceBuffer.byteLength < minBytes && oldPath.endsWith('.webp')) {
    return { status: 'skip', reason: 'already small webp', bytes: sourceBuffer.byteLength };
  }

  const optimizedBuffer = await optimizeImage(sourceBuffer);
  if (optimizedBuffer.byteLength >= sourceBuffer.byteLength * 0.95 && oldPath.endsWith('.webp')) {
    return { status: 'skip', reason: 'no useful gain', bytes: sourceBuffer.byteLength };
  }

  const newPath = [
    'optimized',
    row.type,
    safePathSegment(row.id),
    `${Date.now()}-${index}-${safePathSegment(row.label)}.webp`,
  ].join('/');

  if (!apply) {
    return {
      status: 'dry-run',
      oldPath,
      newPath,
      before: sourceBuffer.byteLength,
      after: optimizedBuffer.byteLength,
    };
  }

  const { error: uploadError } = await supabase.storage.from(bucket).upload(newPath, optimizedBuffer, {
    cacheControl: '31536000',
    contentType: 'image/webp',
    upsert: false,
  });

  if (uploadError) {
    return { status: 'error', reason: uploadError.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(newPath);
  const { error: updateError } = await supabase
    .from(row.table)
    .update({ image_url: data.publicUrl })
    .eq('id', row.id);

  if (updateError) {
    return { status: 'error', reason: updateError.message };
  }

  if (deleteOld && oldPath !== newPath) {
    const { error: deleteError } = await supabase.storage.from(bucket).remove([oldPath]);
    if (deleteError) {
      return {
        status: 'updated-delete-failed',
        reason: deleteError.message,
        oldPath,
        newPath,
        before: sourceBuffer.byteLength,
        after: optimizedBuffer.byteLength,
      };
    }
  }

  return {
    status: deleteOld ? 'updated-deleted-old' : 'updated',
    oldPath,
    newPath,
    before: sourceBuffer.byteLength,
    after: optimizedBuffer.byteLength,
  };
}

const rows = await loadRows();
const candidates = rows.slice(0, Number.isFinite(limit) && limit > 0 ? limit : rows.length);

console.log(
  `${apply ? 'APPLY' : 'DRY RUN'}: scanning ${rows.length} Supabase image URLs, processing ${candidates.length}, delete_old=${deleteOld}.`
);

let updated = 0;
let skipped = 0;
let failed = 0;
let beforeTotal = 0;
let afterTotal = 0;

for (const [index, row] of candidates.entries()) {
  try {
    const result = await processRow(row, index + 1);
    if (result.status === 'skip') skipped += 1;
    if (result.status === 'error') failed += 1;
    if (
      result.status === 'updated' ||
      result.status === 'updated-deleted-old' ||
      result.status === 'updated-delete-failed' ||
      result.status === 'dry-run'
    ) {
      updated += 1;
      beforeTotal += result.before;
      afterTotal += result.after;
    }

    console.log(
      `${row.type}/${row.label || row.id}: ${result.status}` +
        (result.before ? ` ${(result.before / 1024).toFixed(0)}KB -> ${(result.after / 1024).toFixed(0)}KB` : '') +
        (result.oldPath ? ` ${result.oldPath} -> ${result.newPath}` : '') +
        (result.reason ? ` (${result.reason})` : '')
    );
  } catch (error) {
    failed += 1;
    console.log(`${row.type}/${row.label || row.id}: error (${error.message})`);
  }
}

console.log(
  `Done. candidates=${updated}, skipped=${skipped}, failed=${failed}, estimated_saved=${(
    (beforeTotal - afterTotal) /
    1024 /
    1024
  ).toFixed(2)}MB`
);
