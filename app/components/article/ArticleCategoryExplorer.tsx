'use client';

import ArticleCard from '@/app/components/article/ArticleCard';
import type { ArticleCardData } from '@/lib/articleCards';
import { getDestinationLabel } from '@/lib/destinationLabels';
import { useMemo, useState } from 'react';

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

export default function ArticleCategoryExplorer({
  locale,
  articles,
  categories,
  defaultVisibleCount,
  showMoreLabel,
  showFeaturedBadges = true,
}: ArticleCategoryExplorerProps) {
  const [category, setCategory] = useState('');
  const [visiblePageCount, setVisiblePageCount] = useState(1);

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
    if (category) {
      return articles.filter((article) => article.category === category);
    }

    return articles;
  }, [articles, category]);

  const shouldLimitArticles = !category && typeof defaultVisibleCount === 'number';
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
      <nav
        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4"
        aria-label={getDestinationLabel(locale, 'articleCategories')}
      >
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              setCategory('');
              setVisiblePageCount(1);
            }}
            aria-pressed={category === ''}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              category === ''
                ? 'bg-blue-900 text-white shadow-sm'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50'
            }`}
          >
            {getDestinationLabel(locale, 'allArticles')}
            <span className="ml-2 text-xs opacity-70">{articles.length}</span>
          </button>

          {sortedCategories.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setCategory(option.value);
                setVisiblePageCount(1);
              }}
              aria-pressed={category === option.value}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                category === option.value
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50'
              }`}
            >
              {option.label}
              {typeof option.count === 'number' && (
                <span className="ml-2 text-xs opacity-70">{option.count}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

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
                className="inline-flex rounded-full border border-blue-200 bg-white px-5 py-3 text-sm font-extrabold text-blue-900 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-950/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {showMoreLabel}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-sm">
          {getDestinationLabel(locale, 'noFilteredArticles')}
        </div>
      )}
    </section>
  );
}
