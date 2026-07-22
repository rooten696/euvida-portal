'use client';

import ArticleCategoryExplorer from '@/app/components/article/ArticleCategoryExplorer';
import type { ArticleCardData } from '@/lib/articleCards';
import { getArticleCategoryLabel } from '@/lib/articleCards';
import { getDestinationLabel } from '@/lib/destinationLabels';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, Suspense } from 'react';

type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

type ArticlesClientProps = {
  locale: string;
  articles: ArticleCardData[];
  categories: FilterOption[];
};

const maxSearchQueryLength = 80;
const maxSearchTerms = 6;

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

function getSearchQuery(searchParams: URLSearchParams): string {
  const query = (searchParams.get('q') ?? searchParams.get('query') ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  return query.length <= maxSearchQueryLength ? query : '';
}

function articleMatchesQuery(article: ArticleCardData, query: string): boolean {
  if (!query) {
    return true;
  }

  const terms = normalizeSearchText(query)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxSearchTerms);

  if (terms.length === 0) {
    return true;
  }

  const haystack = normalizeSearchText(
    [
      article.title,
      article.excerpt,
      article.category,
      article.categoryLabel,
      article.countryName,
      article.regionName,
    ]
      .filter(Boolean)
      .join(' ')
  );

  return terms.every((term) => haystack.includes(term));
}

function categoryOptions(articles: ArticleCardData[], locale: string): FilterOption[] {
  const counts = new Map<string, number>();

  for (const article of articles) {
    if (article.category) {
      counts.set(article.category, (counts.get(article.category) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([category, count]) => ({
      value: category,
      label: getArticleCategoryLabel(category, locale) ?? category,
      count,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, locale));
}

function ArticlesClientInner({ locale, articles, categories }: ArticlesClientProps) {
  const searchParams = useSearchParams();
  const query = getSearchQuery(searchParams);
  const visibleArticles = useMemo(
    () => articles.filter((article) => articleMatchesQuery(article, query)),
    [articles, query]
  );
  const visibleCategories = query ? categoryOptions(visibleArticles, locale) : categories;
  const heading = query
    ? `${getDestinationLabel(locale, 'searchResultsFor')} "${query}"`
    : getDestinationLabel(locale, 'allArticles');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <nav className="mb-8 text-sm font-bold text-slate-400">
          <Link href={`/${locale}`} className="hover:text-emerald-500 transition-colors">
            {getDestinationLabel(locale, 'home')}
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-slate-300">
            {query
              ? getDestinationLabel(locale, 'searchResults')
              : getDestinationLabel(locale, 'allArticles')}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-500">
              {query
                ? getDestinationLabel(locale, 'searchResults')
                : getDestinationLabel(locale, 'latestArticles')}
            </p>
            <h1 className="mt-2 break-words text-4xl font-black tracking-tight text-white md:text-6xl">
              {heading}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-400">
              {getDestinationLabel(locale, 'allArticlesIntro')}
            </p>
          </div>

          <form
            action={`/${locale}/articles`}
            className="rounded-2xl border border-white/10 bg-slate-900 p-3 shadow-xl"
          >
            <label htmlFor="article-search" className="sr-only">
              {getDestinationLabel(locale, 'articleSearchPlaceholder')}
            </label>
            <div className="flex gap-2">
              <input
                id="article-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder={getDestinationLabel(locale, 'articleSearchPlaceholder')}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-semibold text-white outline-none transition focus:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/10 placeholder-slate-400"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-4 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-400 cursor-pointer"
              >
                {getDestinationLabel(locale, 'articleSearchButton')}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
        {visibleArticles.length > 0 ? (
          <ArticleCategoryExplorer
            locale={locale}
            articles={visibleArticles}
            categories={visibleCategories}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-8 text-center text-sm font-medium text-slate-400 shadow-md">
            {query
              ? getDestinationLabel(locale, 'noSearchResults')
              : getDestinationLabel(locale, 'noArticles')}
          </div>
        )}
      </section>
    </main>
  );
}

export default function ArticlesClient(props: ArticlesClientProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <ArticlesClientInner {...props} />
    </Suspense>
  );
}
