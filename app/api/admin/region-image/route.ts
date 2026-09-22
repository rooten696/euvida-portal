import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';

const supportedLocales = ['cs', 'en', 'de', 'fr', 'es'];

function revalidateRegionPaths(regionId?: string | null) {
  revalidatePath('/sitemap.xml');

  for (const locale of supportedLocales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/regions`);
    revalidatePath(`/${locale}/countries`);

    if (regionId) {
      revalidatePath(`/${locale}/region/${regionId}`);
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
        image_url?: string | null;
      }
    | null;

  if (!body?.id) {
    return NextResponse.json({ ok: false, error: 'Missing region id.' }, { status: 400 });
  }

  const { data, error } = await auth.writeClient
    .from('regions')
    .update({
      image_url: body.image_url || null,
    })
    .eq('id', body.id)
    .select('id');

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Uložení zablokovala RLS policy. Nastavte SUPABASE_SERVICE_ROLE_KEY ve Vercelu, nebo přidejte RLS policy pro admin update regionů.',
      },
      { status: 403 }
    );
  }

  revalidateRegionPaths(data[0]?.id ?? body.id);

  return NextResponse.json({ ok: true, id: data[0]?.id ?? body.id });
}
