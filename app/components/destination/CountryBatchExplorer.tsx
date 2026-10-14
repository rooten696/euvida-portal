'use client';

import DestinationCard from '@/app/components/destination/DestinationCard';
import ScrollToTopButton from '@/app/components/ScrollToTopButton';
import { getDestinationLabel } from '@/lib/destinationLabels';
import { useState } from 'react';

export type CountryDestinationItem = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  flag?: string | null;
  articleCount: number;
  regionCount?: number;
};

export type CountryBatchExplorerProps = {
  locale: string;
  countries: CountryDestinationItem[];
  defaultVisibleCount?: number;
  batchSize?: number;
  allCountriesHref?: string;
  allCountriesLabel?: string;
  emptyMessage?: string;
  showScrollToTop?: boolean;
};

export default function CountryBatchExplorer({
  locale,
  countries,
  defaultVisibleCount = 6,
  batchSize = 6,
  allCountriesHref,
  allCountriesLabel,
  emptyMessage,
  showScrollToTop = false,
}: CountryBatchExplorerProps) {
  const safeDefault = Math.max(1, defaultVisibleCount);
  const safeBatch = Math.max(1, batchSize);
  const [visibleCount, setVisibleCount] = useState(safeDefault);

  if (countries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-8 text-center text-sm font-medium text-slate-400 shadow-sm">
        {emptyMessage ?? getDestinationLabel(locale, 'noData')}
      </div>
    );
  }

  const visibleCountries = countries.slice(0, visibleCount);
  const hasMore = visibleCount < countries.length;
  const loadMoreLabel = getDestinationLabel(locale, 'loadMoreCountries');
  const allLabel = allCountriesLabel ?? getDestinationLabel(locale, 'showAllCountries');

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`${visibleCountries.length} / ${countries.length}`}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCountries.map((country) => (
          <DestinationCard
            key={country.id}
            href={`/${locale}/country/${country.id}`}
            title={country.name}
            description={country.description}
            imageUrl={country.image_url}
            imageAlt={country.name}
            badge={getDestinationLabel(locale, 'countryGuide')}
            flag={country.flag}
            flagSrc={`/flags/${country.id.toLowerCase()}.svg`}
            stats={[
              {
                label: getDestinationLabel(locale, 'articlesCount'),
                value: country.articleCount,
              },
              {
                label: getDestinationLabel(locale, 'regionsCount'),
                value: country.regionCount ?? 0,
              },
            ]}
            actionLabel={getDestinationLabel(locale, 'exploreCountry')}
          />
        ))}
      </div>

      {(hasMore || allCountriesHref) && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + safeBatch)}
              className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-extrabold text-emerald-400 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              {loadMoreLabel}
            </button>
          )}
          {allCountriesHref && (
            <a
              href={allCountriesHref}
              className="inline-flex rounded-full border border-white/10 bg-slate-900/60 px-5 py-3 text-sm font-extrabold text-slate-300 shadow-sm transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-slate-800 hover:text-white"
            >
              {allLabel}
            </a>
          )}
        </div>
      )}

      {showScrollToTop && visibleCountries.length > 12 && (
        <ScrollToTopButton locale={locale} />
      )}
    </>
  );
}
