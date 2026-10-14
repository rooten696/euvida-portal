import ArticleCard from './ArticleCard';
import { getArticleLabel } from '@/lib/articleLabels';
import type { RelatedArticleCard } from '@/lib/relatedArticles';
import type { SupportedLocale } from '@/lib/articleTypes';

type RelatedArticlesProps = {
  locale: SupportedLocale;
  items: RelatedArticleCard[];
};

function reasonLabel(item: RelatedArticleCard, locale: SupportedLocale): string {
  if (item.reason === 'distance') {
    if (typeof item.distanceKm === 'number') {
      return `${Math.max(1, Math.round(item.distanceKm))} km`;
    }
    return getArticleLabel(locale, 'relatedDistance');
  }

  return getArticleLabel(
    locale,
    item.reason === 'region' ? 'relatedRegion' : 'relatedCategory'
  );
}

export default function RelatedArticles({ locale, items }: RelatedArticlesProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="related-articles-heading" className="mt-12 border-t border-white/10 pt-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-500">
            Euvida
          </p>
          <h2 id="related-articles-heading" className="mt-2 text-2xl font-extrabold text-white md:text-3xl">
            {getArticleLabel(locale, 'relatedArticles')}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <div key={item.article.slug} className="flex min-w-0 flex-col gap-2">
            <span className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-emerald-400">
              {reasonLabel(item, locale)}
            </span>
            <ArticleCard
              article={item.article}
              locale={locale}
              fallbackIndex={index}
              showFeaturedBadge={false}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
