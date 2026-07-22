'use client';

import ArticleCard from '@/app/components/article/ArticleCard';
import type { ArticleCardData } from '@/lib/articleCards';
import { getDestinationLabel } from '@/lib/destinationLabels';
import { useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export type ArticleCategoryOption = {
  value: string;
  label: string;
  count?: number;
};

type ArticleCategoryExplorerProps = {
  locale: string;
  articles: ArticleCardData[];
  categories: ArticleCategoryOption[];
  defaultVisibleCount?: number;
  showMoreLabel?: string;
  showFeaturedBadges?: boolean;
};

const categoryOrder = [
  'places',
  'place',
  'landmark',
  'bike_trail',
  'natural_swimming',
  'beach',
  'camping',
  'trail',
  'cycling_route',
  'cycling',
  'castle',
  'chateau',
  'ski_area',
  'ski',
  'city_tip',
  'city',
  'nature',
];

function getCategoryRank(category: string): number {
  const index = categoryOrder.indexOf(category);
  return index === -1 ? categoryOrder.length : index;
}

function ArticleCategoryExplorerInner({
  locale,
  articles,
  categories,
  defaultVisibleCount,
  showMoreLabel,
  showFeaturedBadges = true,
}: ArticleCategoryExplorerProps) {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get('category') || '';
  const urlCountry = searchParams.get('country') || '';
  
  const [category, setCategory] = useState(urlCategory);
  const [country, setCountry] = useState(urlCountry);
  const [visiblePageCount, setVisiblePageCount] = useState(1);

  // Zajištění interaktivity s URL (např. z Navbar sub-baru)
  useEffect(() => {
    setCategory(searchParams.get('category') || '');
    setCountry(searchParams.get('country') || '');
  }, [searchParams]);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((left, right) => {
        const rank = getCategoryRank(left.value) - getCategoryRank(right.value);

        if (rank !== 0) {
          return rank;
        }

        return left.label.localeCompare(right.label, locale);
      }),
    [categories, locale]
  );

  const filteredArticles = useMemo(() => {
    let result = articles;

    if (category) {
      const activeCategories = category.split(',');
      result = result.filter((article) => article.category && activeCategories.includes(article.category));
    }

    if (country) {
      const activeCountries = country.split(',').map((countryId) => countryId.toUpperCase());
      result = result.filter(
        (article) => article.countryId && activeCountries.includes(article.countryId.toUpperCase())
      );
    }

    return result;
  }, [articles, category, country]);

  const shouldLimitArticles = !category && !country && typeof defaultVisibleCount === 'number';
  const visibleCount = shouldLimitArticles
    ? defaultVisibleCount * visiblePageCount
    : filteredArticles.length;
  const visibleArticles = shouldLimitArticles
    ? filteredArticles.slice(0, visibleCount)
    : filteredArticles;
  const hasMoreArticles =
    Boolean(showMoreLabel) && shouldLimitArticles && visibleArticles.length < filteredArticles.length;

  return (
    <section className="space-y-6">
      {/* 
        Menu "Nejnovější články" bylo odstraněno dle požadavku, 
        protože filtrace probíhá z hlavního Sub-baru navigace.
      */}

      {visibleArticles.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleArticles.map((article, index) => (
              <ArticleCard
                key={article.slug}
                article={article}
                locale={locale}
                priority={index < 3}
                showFeaturedBadge={showFeaturedBadges}
              />
            ))}
          </div>

          {hasMoreArticles && defaultVisibleCount && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisiblePageCount((currentCount) => currentCount + 1)}
                className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-extrabold text-emerald-400 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                {showMoreLabel}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-8 text-center text-sm font-medium text-slate-400 shadow-sm">
          {getDestinationLabel(locale, 'noFilteredArticles')}
        </div>
      )}
    </section>
  );
}

export default function ArticleCategoryExplorer(props: ArticleCategoryExplorerProps) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse bg-slate-900/40 rounded-3xl" />}>
      <ArticleCategoryExplorerInner {...props} />
    </Suspense>
  );
}
