'use client';

import ArticleCard from '@/app/components/article/ArticleCard';
import type { ArticleCardData } from '@/lib/articleCards';
import { getDestinationLabel } from '@/lib/destinationLabels';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type FilterOption = {
  value: string;
  label: string;
};

type RegionArticleExplorerProps = {
  locale: string;
  articles: ArticleCardData[];
  categories: FilterOption[];
  countryHref: string;
  countryName?: string | null;
};

export default function RegionArticleExplorer({
  locale,
  articles,
  categories,
  countryHref,
  countryName,
}: RegionArticleExplorerProps) {
  const [category, setCategory] = useState('');

  const filteredArticles = useMemo(
    () => articles.filter((article) => (category ? article.category === category : true)),
    [articles, category]
  );

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-base font-semibold text-slate-600">
          {getDestinationLabel(locale, 'noRegionArticles')}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href={countryHref}
            className="inline-flex rounded-full bg-blue-900 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {countryName
              ? `${getDestinationLabel(locale, 'backToCountry')}: ${countryName}`
              : getDestinationLabel(locale, 'backToCountry')}
          </Link>
          <Link
            href={`/${locale}`}
            className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-extrabold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {getDestinationLabel(locale, 'backToHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-blue-700">
          {getDestinationLabel(locale, 'regionCategories')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={`rounded-full px-4 py-2 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              category === ''
                ? 'bg-blue-900 text-white'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50'
            }`}
          >
            {getDestinationLabel(locale, 'allCategories')}
          </button>
          {categories.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCategory(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                category === option.value
                  ? 'bg-blue-900 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredArticles.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article) => (
            <ArticleCard key={article.slug} article={article} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-sm">
          {getDestinationLabel(locale, 'noFilteredArticles')}
        </div>
      )}
    </section>
  );
}
