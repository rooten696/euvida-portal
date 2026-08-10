import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supportedLocales = ['cs', 'en', 'de', 'fr', 'es'];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const imageBucket = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET ?? 'article-images';
const maxRemoteImageBytes = 12 * 1024 * 1024;

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

  if (error || !data.user) {
    return null;
  }

  return accessToken;
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

function extensionFromContentType(contentType: string): string | null {
  if (contentType.includes('image/jpeg')) return 'jpg';
  if (contentType.includes('image/png')) return 'png';
  if (contentType.includes('image/webp')) return 'webp';
  if (contentType.includes('image/gif')) return 'gif';
  return null;
}

function extractHtmlImageUrl(html: string, baseUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return new URL(match[1].replace(/&amp;/g, '&'), baseUrl).toString();
    }
  }

  return null;
}

async function fetchRemoteImage(imageUrl: string, depth = 0): Promise<{ response?: Response; error?: string }> {
  let response: Response;

  try {
    response = await fetch(imageUrl, {
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,text/html;q=0.4,*/*;q=0.2',
      },
    });
  } catch {
    return { error: 'Obrázek se nepodařilo stáhnout.' };
  }

  if (!response.ok) {
    return { error: `Obrázek se nepodařilo stáhnout. HTTP ${response.status}` };
  }

  const contentType = response.headers.get('content-type') || '';
  if (extensionFromContentType(contentType)) {
    return { response };
  }

  if (depth === 0 && contentType.includes('text/html')) {
    const html = await response.text();
    const extractedUrl = extractHtmlImageUrl(html, response.url || imageUrl);
    if (extractedUrl) {
      return fetchRemoteImage(extractedUrl, depth + 1);
    }
    return { error: 'URL vede na HTML stránku a nepodařilo se z ní najít náhledový obrázek.' };
  }

  return { error: 'Adresa nevrátila podporovaný obrázek JPG, PNG, WEBP nebo GIF.' };
}

export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
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
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      throw new Error('Unsupported protocol');
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'URL obrázku není platná.' }, { status: 400 });
  }

  const remoteImage = await fetchRemoteImage(imageUrl);
  if (remoteImage.error || !remoteImage.response) {
    return NextResponse.json({ ok: false, error: remoteImage.error }, { status: 400 });
  }

  const response = remoteImage.response;
  const contentType = response.headers.get('content-type') || '';
  const extension = extensionFromContentType(contentType);
  if (!extension) {
    return NextResponse.json(
      { ok: false, error: 'Adresa nevrátila podporovaný obrázek JPG, PNG, WEBP nebo GIF.' },
      { status: 400 }
    );
  }

  const contentLength = Number(response.headers.get('content-length') || '0');
  if (contentLength > maxRemoteImageBytes) {
    return NextResponse.json(
      { ok: false, error: 'Obrázek je větší než 12 MB. Nejdřív ho zmenšete.' },
      { status: 400 }
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxRemoteImageBytes) {
    return NextResponse.json(
      { ok: false, error: 'Obrázek je větší než 12 MB. Nejdřív ho zmenšete.' },
      { status: 400 }
    );
  }

  const entityType = safePathSegment(body?.entityType || 'articles');
  const entityId = safePathSegment(body?.entityId || 'article');
  const articleId = body?.articleId?.trim();
  const filePath = `${entityType}/${entityId}/${Date.now()}-remote.${extension}`;
  const writeClient = getWriteClient(accessToken);

  const { error } = await writeClient.storage
    .from(imageBucket)
    .upload(filePath, Buffer.from(arrayBuffer), {
      cacheControl: '31536000',
      contentType,
      upsert: false,
    });

  if (error) {
    const message =
      !supabaseServiceKey && /violates row-level security|row-level security|RLS/i.test(error.message)
        ? 'Chyba uploadu: Storage RLS blokuje zápis. Nastavte SUPABASE_SERVICE_ROLE_KEY ve Vercelu pro tento web.'
        : `Chyba uploadu: ${error.message}`;
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
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
    }
  }

  return NextResponse.json({ ok: true, publicUrl });
}
