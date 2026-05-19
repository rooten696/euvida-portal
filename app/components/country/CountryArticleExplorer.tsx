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

type CountryArticleExplorerProps = {
  locale: string;
  articles: ArticleCardData[];
  regions: FilterOption[];
  categories: FilterOption[];
};

export default function CountryArticleExplorer({
  locale,
  articles,
  regions,
  categories,
}: CountryArticleExplorerProps) {
  const [region, setRegion] = useState('');
  const [category, setCategory] = useState('');

  const filteredArticles = useMemo(
    () =>
      articles
        .filter((article) => (region ? article.regionId === region : true))
        .filter((article) => (category ? article.category === category : true)),
    [articles, category, region]
  );

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-base font-semibold text-slate-600">
          {getDestinationLabel(locale, 'noCountryArticles')}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href={`/${locale}`}
            className="inline-flex rounded-full bg-blue-900 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {getDestinationLabel(locale, 'backToHome')}
          </Link>
          <Link
            href={`/${locale}#countries`}
            className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-extrabold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {getDestinationLabel(locale, 'countries')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-blue-700">
          {getDestinationLabel(locale, 'filterArticles')}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            <span>{getDestinationLabel(locale, 'regions')}</span>
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="">{getDestinationLabel(locale, 'allRegions')}</option>
              {regions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            <span>{getDestinationLabel(locale, 'articleCategories')}</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="">{getDestinationLabel(locale, 'allCategories')}</option>
              {categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
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
