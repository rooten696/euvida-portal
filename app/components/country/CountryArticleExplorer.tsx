'use client';

import ArticleCategoryExplorer from '@/app/components/article/ArticleCategoryExplorer';
import type { ArticleCardData } from '@/lib/articleCards';
import { getDestinationLabel } from '@/lib/destinationLabels';
import Link from 'next/link';

type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

type CountryArticleExplorerProps = {
  locale: string;
  articles: ArticleCardData[];
  categories: FilterOption[];
};

export default function CountryArticleExplorer({
  locale,
  articles,
  categories,
}: CountryArticleExplorerProps) {
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
    <ArticleCategoryExplorer
      locale={locale}
      articles={articles}
      categories={categories}
      defaultVisibleCount={12}
      showMoreLabel={getDestinationLabel(locale, 'showMoreArticles')}
    />
  );
}
