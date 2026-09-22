import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';

const supportedLocales = ['cs', 'en', 'de', 'fr', 'es'];

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
  const auth = await verifyAdminRequest(request, undefined, { requireWrite: false });
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
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
