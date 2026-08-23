import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supportedLocales = ['cs', 'en', 'de', 'fr', 'es'];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

export async function PATCH(request: NextRequest) {
  const accessToken = await getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
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

  const writeClient = getWriteClient(accessToken);
  const { data, error } = await writeClient
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
