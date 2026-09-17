import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWaterQualityForArticle } from '@/lib/waterQuality';
import type { SourceInfo } from '@/lib/articleTypes';

const supportedLocales = ['cs', 'en', 'de', 'fr', 'es'];
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type WaterArticle = {
  slug: string;
  source_info: SourceInfo | null;
};

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return request.headers.has('x-vercel-cron');
  }

  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

function revalidateArticle(slug: string) {
  for (const locale of supportedLocales) {
    revalidatePath(`/${locale}/article/${slug}`);
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('articles')
    .select('slug, source_info')
    .eq('published', true)
    .in('category', ['natural_swimming', 'fkk'])
    .limit(120);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let refreshed = 0;
  const failed: string[] = [];

  for (const article of (data ?? []) as WaterArticle[]) {
    try {
      await getWaterQualityForArticle(article.source_info);
      revalidateArticle(article.slug);
      refreshed += 1;
    } catch {
      failed.push(article.slug);
    }
  }

  revalidatePath('/sitemap.xml');

  return NextResponse.json({
    ok: true,
    refreshed,
    failed,
    checkedAt: new Date().toISOString(),
  });
}
