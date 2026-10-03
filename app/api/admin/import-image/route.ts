import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifyAdminRequest } from '@/lib/adminAuth';
import sharp from 'sharp';
import { downloadRemoteImage } from '@/lib/remoteImage';

const supportedLocales = ['cs', 'en', 'de', 'fr', 'es'];
const imageBucket = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET ?? 'article-images';
const maxOptimizedImageBytes = 12 * 1024 * 1024;
const optimizedImageContentType = 'image/webp';


function safePathSegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}


async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { animated: false, limitInputPixels: 40000000 })
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




export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized || !auth.writeClient) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        imageUrl?: string;
        entityType?: string;
        entityId?: string;
        articleId?: string | null;
      }
    | null;

  const imageUrl = body?.imageUrl?.trim();

  if (!imageUrl) {
    return NextResponse.json({ ok: false, error: 'Chybí URL obrázku.' }, { status: 400 });
  }

  try {
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== 'https:') {
      throw new Error('Unsupported protocol');
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'URL obrázku není platná.' }, { status: 400 });
  }

  let optimizedBuffer: Buffer;
  try {
    optimizedBuffer = await optimizeImage(await downloadRemoteImage(imageUrl));
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Obrázek se nepodařilo bezpečně stáhnout nebo optimalizovat. Použijte veřejnou HTTPS adresu JPG, PNG, WEBP nebo GIF (nejvýše 40 MB).' },
      { status: 400 }
    );
  }

  if (optimizedBuffer.byteLength > maxOptimizedImageBytes) {
    return NextResponse.json(
      { ok: false, error: 'Optimalizovaný obrázek je stále větší než 12 MB.' },
      { status: 400 }
    );
  }

  const entityType = safePathSegment(body?.entityType || 'articles');
  const entityId = safePathSegment(body?.entityId || 'article');
  const articleId = body?.articleId?.trim();
  const filePath = `${entityType}/${entityId}/${Date.now()}-remote.webp`;
  const writeClient = auth.writeClient;

  const { error } = await writeClient.storage
    .from(imageBucket)
    .upload(filePath, optimizedBuffer, {
      cacheControl: '31536000',
      contentType: optimizedImageContentType,
      upsert: false,
    });

  if (error) {
    const message = `Chyba uploadu: ${error.message}`;
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const { data } = writeClient.storage.from(imageBucket).getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  if (articleId) {
    const { data: articleRows, error: dbError } = await writeClient
      .from('articles')
      .update({ image_url: publicUrl })
      .eq('id', articleId)
      .select('id, slug, country_id, region_id');

    if (dbError) {
      return NextResponse.json(
        {
          ok: false,
          error: `Obrázek je uložený, ale URL se nepodařilo zapsat do článku: ${dbError.message}`,
        },
        { status: 500 }
      );
    }

    if (!articleRows || articleRows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Obrázek je uložený, ale update článku zablokovala RLS policy. Nastavte SUPABASE_SERVICE_ROLE_KEY ve Vercelu.',
        },
        { status: 403 }
      );
    }

    revalidatePath('/sitemap.xml');
    for (const locale of supportedLocales) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/articles`);
      if (articleRows[0]?.slug) {
        revalidatePath(`/${locale}/article/${articleRows[0].slug}`);
      }
      if (articleRows[0]?.country_id) revalidatePath(`/${locale}/country/${articleRows[0].country_id}`);
      if (articleRows[0]?.region_id) revalidatePath(`/${locale}/region/${articleRows[0].region_id}`);
    }
  }

  if (!articleId && ['regions', 'countries'].includes(entityType)) {
    const { data: entityRows, error: dbError } = await writeClient
      .from(entityType)
      .update({ image_url: publicUrl })
      .eq('id', body?.entityId)
      .select('id');

    if (dbError) {
      return NextResponse.json(
        {
          ok: false,
          error: `Obrázek je uložený, ale URL se nepodařilo zapsat do ${entityType}: ${dbError.message}`,
        },
        { status: 500 }
      );
    }

    if (!entityRows || entityRows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Obrázek je uložený, ale update zablokovala RLS policy. Nastavte SUPABASE_SERVICE_ROLE_KEY ve Vercelu.',
        },
        { status: 403 }
      );
    }

    revalidatePath('/sitemap.xml');
    for (const locale of supportedLocales) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/countries`);
      revalidatePath(`/${locale}/regions`);

      if (entityType === 'countries') {
        revalidatePath(`/${locale}/country/${entityRows[0].id}`);
      }

      if (entityType === 'regions') {
        revalidatePath(`/${locale}/region/${entityRows[0].id}`);
      }
    }
  }

  return NextResponse.json({ ok: true, publicUrl });
}
