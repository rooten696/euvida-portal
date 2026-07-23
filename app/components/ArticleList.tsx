import ArticleCard from '@/app/components/article/ArticleCard';
import { toArticleCardData } from '@/lib/articleCards';
import { normalizeLocale } from '@/lib/articleLocalization';
import type { Article } from '@/lib/articleTypes';
import { getDestinationLabel } from '@/lib/destinationLabels';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type ArticleListProps = {
  locale: string;
  countryId?: string;
  regionId?: string;
  limit?: number;
};

export default async function ArticleList({
  locale,
  countryId,
  regionId,
  limit,
}: ArticleListProps) {
  const currentLocale = normalizeLocale(locale);

  let query = supabase
    .from('articles')
    .select('id, slug, image_url, image_alt, category, title, excerpt, content, translations, country_id, region_id, created_at, reading_time_minutes, published, featured')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (countryId) {
    query = query.eq('country_id', countryId);
  }

  if (regionId) {
    query = query.eq('region_id', regionId);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data: articles, error } = await query;

  if (error) {
    console.error('Chyba při načítání článků:', error);
    return null;
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-sm">
        {getDestinationLabel(currentLocale, 'noArticles')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {(articles as Article[]).map((article, index) => (
        <ArticleCard
          key={article.id ?? article.slug}
          article={toArticleCardData(article, currentLocale)}
          locale={currentLocale}
          fallbackIndex={index}
        />
      ))}
    </div>
  );
}
