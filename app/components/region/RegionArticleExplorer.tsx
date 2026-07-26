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
  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center shadow-xl backdrop-blur">
        <p className="text-base font-semibold text-slate-400">
          {getDestinationLabel(locale, 'noRegionArticles')}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href={countryHref}
            className="inline-flex rounded-full bg-emerald-500/20 border border-emerald-500/30 px-5 py-2.5 text-sm font-extrabold text-emerald-400 transition hover:bg-emerald-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {countryName
              ? `${getDestinationLabel(locale, 'backToCountry')}: ${countryName}`
              : getDestinationLabel(locale, 'backToCountry')}
          </Link>
          <Link
            href={`/${locale}`}
            className="inline-flex rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-extrabold text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {getDestinationLabel(locale, 'backToHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ArticleCategoryExplorer locale={locale} articles={articles} categories={categories} />
  );
}
