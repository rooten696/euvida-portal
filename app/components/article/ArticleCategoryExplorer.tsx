'use client';

import ArticleCard from '@/app/components/article/ArticleCard';
import { toArticleCardData, type ArticleCardData } from '@/lib/articleCards';
import type { Article } from '@/lib/articleTypes';
import { getDestinationLabel } from '@/lib/destinationLabels';
import { supabase } from '@/lib/supabaseBrowserClient';
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
  countryNamesById?: Record<string, string>;
  regionNamesById?: Record<string, string>;
};

const categoryOrder = [
  'places',
  'place',
  'landmark',
  'bike_trail',
  'natural_swimming',
  'fkk',
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

const filteredArticleSelect =
  'id, slug, title, excerpt, translations, image_url, image_alt, country_id, region_id, category, visit_info, published, featured, created_at, reading_time_minutes';
const maxFilteredArticles = 1000;

function splitParam(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCategoryRank(category: string): number {
  const index = categoryOrder.indexOf(category);
  return index === -1 ? categoryOrder.length : index;
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

function ArticleCategoryExplorerInner({
  locale,
  articles,
  categories,
  defaultVisibleCount,
  showMoreLabel,
  showFeaturedBadges = true,
  countryNamesById,
  regionNamesById,
}: ArticleCategoryExplorerProps) {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get('category') || '';
  const urlCountry = searchParams.get('country') || '';
  
  const [category, setCategory] = useState(urlCategory);
  const [country, setCountry] = useState(urlCountry);
  const [visiblePageCount, setVisiblePageCount] = useState(1);
  const [remoteArticles, setRemoteArticles] = useState<ArticleCardData[] | null>(null);
  const [isLoadingRemoteArticles, setIsLoadingRemoteArticles] = useState(false);
  const [remoteArticlesError, setRemoteArticlesError] = useState(false);

  // Zajištění interaktivity s URL (např. z Navbar sub-baru)
  useEffect(() => {
    setCategory(searchParams.get('category') || '');
    setCountry(searchParams.get('country') || '');
  }, [searchParams]);

  const activeCategories = useMemo(() => splitParam(category), [category]);
  const activeCountries = useMemo(
    () => splitParam(country).map((countryId) => countryId.toUpperCase()),
    [country]
  );
  const hasActiveFilters = activeCategories.length > 0 || activeCountries.length > 0;
  const activeCategoryKey = activeCategories.join(',');
  const activeCountryKey = activeCountries.join(',');

  useEffect(() => {
    setVisiblePageCount(1);
  }, [activeCategoryKey, activeCountryKey]);

  useEffect(() => {
    if (!hasActiveFilters) {
      setRemoteArticles(null);
      setIsLoadingRemoteArticles(false);
      setRemoteArticlesError(false);
      return;
    }

    let cancelled = false;

    async function loadFilteredArticles() {
      setIsLoadingRemoteArticles(true);
      setRemoteArticlesError(false);

      let query = supabase
        .from('articles')
        .select(filteredArticleSelect)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(maxFilteredArticles);

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

      const { data, error } = await query;

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
        ((data ?? []) as Article[]).map((article) =>
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
  ]);

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
    let result = remoteArticles ?? articles;

    result = result.filter((article) => matchesActiveCategories(article, activeCategories));

    if (activeCountries.length > 0) {
      result = result.filter(
        (article) => article.countryId && activeCountries.includes(article.countryId.toUpperCase())
      );
    }

    return result;
  }, [activeCategories, activeCountries, articles, remoteArticles]);

  const shouldLimitArticles = !hasActiveFilters && typeof defaultVisibleCount === 'number';
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
                priority={index < 3}
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

export default function ArticleCategoryExplorer(props: ArticleCategoryExplorerProps) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse bg-slate-900/40 rounded-3xl" />}>
      <ArticleCategoryExplorerInner {...props} />
    </Suspense>
  );
}
