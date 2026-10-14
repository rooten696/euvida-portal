'use client';

import DestinationCard from '@/app/components/destination/DestinationCard';
import ScrollToTopButton from '@/app/components/ScrollToTopButton';
import { getDestinationLabel } from '@/lib/destinationLabels';
import { useState } from 'react';

export type RegionDestinationItem = {
  id: string;
  country_id?: string | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  articleCount: number;
  countryName?: string | null;
};

export type RegionBatchExplorerProps = {
  locale: string;
  regions: RegionDestinationItem[];
  defaultVisibleCount?: number;
  batchSize?: number;
  columns?: '3' | '4';
  showCountryInStats?: boolean;
  allRegionsHref?: string;
  allRegionsLabel?: string;
  emptyMessage?: string;
  showScrollToTop?: boolean;
};

export default function RegionBatchExplorer({
  locale,
  regions,
  defaultVisibleCount,
  batchSize,
  columns = '4',
  showCountryInStats = false,
  allRegionsHref,
  allRegionsLabel,
  emptyMessage,
  showScrollToTop = false,
}: RegionBatchExplorerProps) {
  const initialCount = Math.max(
    1,
    defaultVisibleCount ?? (columns === '3' ? 18 : 8)
  );
  const increment = Math.max(1, batchSize ?? (columns === '3' ? 18 : 8));
  const [visibleCount, setVisibleCount] = useState(initialCount);

  if (regions.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-8 text-center text-sm font-medium text-slate-400 shadow-sm">
        {emptyMessage ?? getDestinationLabel(locale, 'noData')}
      </div>
    );
  }

  const visibleRegions = regions.slice(0, visibleCount);
  const hasMore = visibleCount < regions.length;
  const loadMoreLabel = getDestinationLabel(locale, 'loadMoreRegions');
  const allLabel = allRegionsLabel ?? getDestinationLabel(locale, 'allRegions');

  const gridClassName =
    columns === '3'
      ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4';

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`${visibleRegions.length} / ${regions.length}`}
      </div>

      <div className={gridClassName}>
        {visibleRegions.map((region) => (
          <DestinationCard
            key={region.id}
            href={`/${locale}/region/${region.id}`}
            title={region.name}
            description={region.description}
            imageUrl={region.image_url}
            imageAlt={region.name}
            badge={getDestinationLabel(locale, 'regionGuide')}
            stats={
              showCountryInStats
                ? [
                    {
                      label: getDestinationLabel(locale, 'articlesCount'),
                      value: region.articleCount,
                    },
                    {
                      label: getDestinationLabel(locale, 'countries'),
                      value: region.countryName ?? getDestinationLabel(locale, 'noData'),
                    },
                  ]
                : [
                    {
                      label: getDestinationLabel(locale, 'articlesCount'),
                      value: region.articleCount,
                    },
                  ]
            }
            actionLabel={getDestinationLabel(locale, 'exploreRegion')}
          />
        ))}
      </div>

      {(hasMore || allRegionsHref) && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + increment)}
              className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-extrabold text-emerald-400 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              {loadMoreLabel}
            </button>
          )}
          {allRegionsHref && (
            <a
              href={allRegionsHref}
              className="inline-flex rounded-full border border-white/10 bg-slate-900/60 px-5 py-3 text-sm font-extrabold text-slate-300 shadow-sm transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-slate-800 hover:text-white"
            >
              {allLabel}
            </a>
          )}
        </div>
      )}

      {showScrollToTop && visibleRegions.length > 12 && (
        <ScrollToTopButton locale={locale} />
      )}
    </>
  );
}
