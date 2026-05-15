'use client';

import ArticleCard from '@/app/components/article/ArticleCard';
import type { ArticleCardData } from '@/lib/articleCards';
import { getDestinationLabel } from '@/lib/destinationLabels';
import { useMemo, useState } from 'react';

type FilterOption = {
  value: string;
  label: string;
};

type HomeArticleExplorerProps = {
  locale: string;
  articles: ArticleCardData[];
  categories: FilterOption[];
  countries: FilterOption[];
};

export default function HomeArticleExplorer({
  locale,
  articles,
  categories,
  countries,
}: HomeArticleExplorerProps) {
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');

  const filteredArticles = useMemo(
    () =>
      articles
        .filter((article) => (category ? article.category === category : true))
        .filter((article) => (country ? article.countryId === country : true))
        .slice(0, 12),
    [articles, category, country]
  );

  return (
    <section>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-blue-700">
          {getDestinationLabel(locale, 'filterArticles')}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
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

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            <span>{getDestinationLabel(locale, 'countries')}</span>
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="">{getDestinationLabel(locale, 'allCountries')}</option>
              {countries.map((option) => (
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
