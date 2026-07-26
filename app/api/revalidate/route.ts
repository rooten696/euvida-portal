import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supportedLocales = ['cs', 'en', 'de', 'fr', 'es'];
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function revalidateCommonPaths(slug?: string | null) {
  revalidatePath('/', 'layout');
  revalidatePath('/sitemap.xml');

  for (const locale of supportedLocales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/articles`);
    revalidatePath(`/${locale}/countries`);
    revalidatePath(`/${locale}/regions`);

    if (slug) {
      revalidatePath(`/${locale}/article/${slug}`);
    }
  }
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  if (!accessToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { slug?: string };
  const slug = typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim() : null;

  revalidateCommonPaths(slug);

  return NextResponse.json({
    ok: true,
    revalidated: {
      sitemap: true,
      listings: true,
      slug,
    },
    revalidatedAt: new Date().toISOString(),
  });
}
