import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supportedLocales = ['cs', 'en', 'de', 'fr', 'es'];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const imageBucket = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET ?? 'article-images';
const maxUploadBytes = 12 * 1024 * 1024;

const authClient = createClient(supabaseUrl, supabaseAnonKey);

function getWriteClient(accessToken: string) {
  return supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      });
}

async function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  if (!accessToken) {
    return null;
  }

  const { data, error } = await authClient.auth.getUser(accessToken);
  return error || !data.user ? null : accessToken;
}

function safePathSegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function extensionFromNameOrType(fileName: string, contentType: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  if (contentType.includes('image/jpeg')) return 'jpg';
  if (contentType.includes('image/png')) return 'png';
  if (contentType.includes('image/webp')) return 'webp';
  if (contentType.includes('image/gif')) return 'gif';
  return 'jpg';
}

function uploadErrorMessage(message: string): string {
  if (!supabaseServiceKey && /violates row-level security|row-level security|RLS/i.test(message)) {
    return 'Chyba uploadu: Storage RLS blokuje zápis. Nastavte SUPABASE_SERVICE_ROLE_KEY ve Vercelu pro tento web.';
  }

  return `Chyba uploadu: ${message}`;
}

function revalidateArticlePaths(slug?: string | null) {
  revalidatePath('/sitemap.xml');

  for (const locale of supportedLocales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/articles`);

    if (slug) {
      revalidatePath(`/${locale}/article/${slug}`);
    }
  }
}

export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Žádný soubor nebyl nahrán.' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ ok: false, error: 'Soubor není obrázek.' }, { status: 400 });
  }

  if (file.size > maxUploadBytes) {
    return NextResponse.json(
      { ok: false, error: 'Obrázek je větší než 12 MB. Nejdřív ho zmenšete.' },
      { status: 400 }
    );
  }

  const writeClient = getWriteClient(accessToken);
  const entityType = safePathSegment(String(formData?.get('entityType') || 'articles'));
  const entityId = safePathSegment(String(formData?.get('entityId') || 'article'));
  const articleId = String(formData?.get('articleId') || '').trim();
  const extension = extensionFromNameOrType(file.name, file.type);
  const filePath = `${entityType}/${entityId}/${Date.now()}-${safePathSegment(file.name) || `upload.${extension}`}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await writeClient.storage
    .from(imageBucket)
    .upload(filePath, Buffer.from(arrayBuffer), {
      cacheControl: '31536000',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { ok: false, error: uploadErrorMessage(uploadError.message) },
      { status: 500 }
    );
  }

  const { data } = writeClient.storage.from(imageBucket).getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  if (articleId) {
    const { data: articleRows, error: dbError } = await writeClient
      .from('articles')
      .update({ image_url: publicUrl })
      .eq('id', articleId)
      .select('id, slug');

    if (dbError) {
      return NextResponse.json(
        {
          ok: false,
          error: `Obrázek je nahraný, ale URL se nepodařilo zapsat do článku: ${dbError.message}`,
        },
        { status: 500 }
      );
    }

    if (!articleRows || articleRows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Obrázek je nahraný, ale update článku zablokovala RLS policy. Nastavte SUPABASE_SERVICE_ROLE_KEY ve Vercelu.',
        },
        { status: 403 }
      );
    }

    revalidateArticlePaths(articleRows[0]?.slug);
  }

  return NextResponse.json({ ok: true, publicUrl });
}
