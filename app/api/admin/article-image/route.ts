import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';

const supportedLocales = ['cs', 'en', 'de', 'fr', 'es'];

function revalidateArticlePaths(slug?: string | null) {
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

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized || !auth.writeClient) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: string;
        slug?: string | null;
        image_url?: string | null;
        image_alt?: unknown;
        source_info?: unknown;
      }
    | null;

  if (!body?.id) {
    return NextResponse.json({ ok: false, error: 'Missing article id.' }, { status: 400 });
  }

  const { data, error } = await auth.writeClient
    .from('articles')
    .update({
      image_url: body.image_url || null,
      image_alt: body.image_alt || null,
      source_info: body.source_info || null,
    })
    .eq('id', body.id)
    .select('id, slug');

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Uložení zablokovala RLS policy. Nastavte SUPABASE_SERVICE_ROLE_KEY ve Vercelu, nebo přidejte RLS policy pro admin update článků.',
      },
      { status: 403 }
    );
  }

  revalidateArticlePaths(data[0]?.slug ?? body.slug);

  return NextResponse.json({ ok: true, slug: data[0]?.slug ?? body.slug ?? null });
}
