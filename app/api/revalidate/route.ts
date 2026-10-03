import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';

const supportedLocales = ['cs', 'en', 'de', 'fr', 'es'];

function revalidateCommonPaths(slug?: string | null, scopes: Array<{ country_id?: string | null; region_id?: string | null }> = []) {
  if (!slug) revalidatePath('/', 'layout');
  revalidatePath('/sitemap.xml');

  for (const locale of supportedLocales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/articles`);
    revalidatePath(`/${locale}/countries`);
    revalidatePath(`/${locale}/regions`);

    if (slug) {
      revalidatePath(`/${locale}/article/${slug}`);
    }
    for (const scope of scopes) {
      if (scope.country_id) revalidatePath(`/${locale}/country/${scope.country_id}`);
      if (scope.region_id) revalidatePath(`/${locale}/region/${scope.region_id}`);
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

  let scopes: Array<{ country_id?: string | null; region_id?: string | null }> = [];
  if (slug && auth.client) {
    const { data, error } = await auth.client.from('articles').select('country_id, region_id').eq('slug', slug).limit(20);
    if (error) return NextResponse.json({ ok: false, error: 'Nepodařilo se určit zemi a region článku.' }, { status: 503 });
    scopes = data || [];
  }
  revalidateCommonPaths(slug, scopes);

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
