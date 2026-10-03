'use client';

import ArticleCard from '@/app/components/article/ArticleCard';
import { toArticleCardData, type ArticleCardData } from '@/lib/articleCards';
import type { Article } from '@/lib/articleTypes';
import { getDestinationLabel } from '@/lib/destinationLabels';
import { supabase } from '@/lib/supabaseBrowserClient';
import { useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getArticleListingSelect, normalizeArticleListing } from '@/lib/articleListing';

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
  countryNamesById?: Record<string, string>;
  regionNamesById?: Record<string, string>;
  countryId?: string;
  regionId?: string;
};


const maxFilteredArticles = 1000;

function splitParam(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}


function hasFkkCategory(article: ArticleCardData): boolean {
  return article.category === 'fkk' || article.categoryTags?.includes('fkk') === true;
}

function matchesActiveCategories(article: ArticleCardData, activeCategories: string[]): boolean {
  if (activeCategories.length === 0) {
    return true;
  }

  return activeCategories.some((activeCategory) =>
    activeCategory === 'fkk'
      ? hasFkkCategory(article)
      : article.category === activeCategory || article.categoryTags?.includes(activeCategory) === true
  );
}

function ArticleCategoryExplorerState({
  locale,
  articles,
  defaultVisibleCount,
  showMoreLabel,
  showFeaturedBadges = true,
  countryNamesById,
  regionNamesById,
  countryId,
  regionId,
  category,
  country,
}: ArticleCategoryExplorerProps & { category: string; country: string }) {
  const [visiblePageCount, setVisiblePageCount] = useState(1);
  const [remoteArticles, setRemoteArticles] = useState<ArticleCardData[] | null>(null);
  const [isLoadingRemoteArticles, setIsLoadingRemoteArticles] = useState(Boolean(category || country));
  const [remoteArticlesError, setRemoteArticlesError] = useState(false);

  const activeCategories = useMemo(() => splitParam(category), [category]);
  const activeCountries = useMemo(
    () => splitParam(country).map((countryId) => countryId.toUpperCase()),
    [country]
  );
  const hasActiveFilters = activeCategories.length > 0 || activeCountries.length > 0;
  const activeCategoryKey = activeCategories.join(',');
  const activeCountryKey = activeCountries.join(',');

  useEffect(() => {
    if (!hasActiveFilters) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadFilteredArticles() {
      setIsLoadingRemoteArticles(true);
      setRemoteArticlesError(false);

      let query = supabase
        .from('articles')
        .select(getArticleListingSelect(locale))
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(maxFilteredArticles);

      if (countryId) query = query.eq('country_id', countryId);
      if (regionId) query = query.eq('region_id', regionId);

      if (activeCountries.length > 0) {
        query = query.in('country_id', activeCountries);
      }

      if (
        activeCategories.length > 0 &&
        !activeCategories.includes('fkk') &&
        !activeCategories.includes('natural_swimming')
      ) {
        query = query.in('category', activeCategories);
      }

      const { data, error } = await query.abortSignal(controller.signal);

      if (cancelled) {
        return;
      }

      if (error) {
        console.error('Chyba při načítání filtrovaných článků:', error);
        setRemoteArticles(null);
        setRemoteArticlesError(true);
        setIsLoadingRemoteArticles(false);
        return;
      }

      setRemoteArticles(
        normalizeArticleListing<Article>(data, locale).map((article) =>
          toArticleCardData(article, locale, {
            countryName: article.country_id ? countryNamesById?.[article.country_id] : null,
            regionName: article.region_id ? regionNamesById?.[article.region_id] : null,
          })
        )
      );
      setIsLoadingRemoteArticles(false);
    }

    loadFilteredArticles();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    activeCategoryKey,
    activeCountryKey,
    activeCategories,
    activeCountries,
    countryNamesById,
    hasActiveFilters,
    locale,
    regionNamesById,
    countryId,
    regionId,
  ]);

  const filteredArticles = useMemo(() => {
    let result = remoteArticles ?? articles;

    result = result.filter((article) => matchesActiveCategories(article, activeCategories));

    if (activeCountries.length > 0) {
      result = result.filter(
        (article) => article.countryId && activeCountries.includes(article.countryId.toUpperCase())
      );
    }

    return result;
  }, [activeCategories, activeCountries, articles, remoteArticles]);

  const shouldLimitArticles = typeof defaultVisibleCount === 'number';
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

      {isLoadingRemoteArticles && hasActiveFilters && !remoteArticles ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-8 text-center text-sm font-medium text-slate-400 shadow-sm">
          {getDestinationLabel(locale, 'loading')}
        </div>
      ) : visibleArticles.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleArticles.map((article, index) => (
              <ArticleCard
                key={article.slug}
                article={article}
                locale={locale}
                showFeaturedBadge={showFeaturedBadges}
                fallbackIndex={index}
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
          {remoteArticlesError
            ? getDestinationLabel(locale, 'loadError')
            : getDestinationLabel(locale, 'noFilteredArticles')}
        </div>
      )}
    </section>
  );
}

function ArticleCategoryExplorerInner(props: ArticleCategoryExplorerProps) {
  const params = useSearchParams();
  const category = params.get('category') || '';
  const country = params.get('country') || '';
  return <ArticleCategoryExplorerState key={`${props.locale}:${props.countryId || ''}:${props.regionId || ''}:${category}:${country}`}
    {...props} category={category} country={country} />;
}

export default function ArticleCategoryExplorer(props: ArticleCategoryExplorerProps) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse bg-slate-900/40 rounded-3xl" />}>
      <ArticleCategoryExplorerInner {...props} />
    </Suspense>
  );
}
