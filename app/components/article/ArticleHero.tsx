import SafeImage from '@/app/components/SafeImage';
import ImageCredit from './ImageCredit';
import WeatherWidget from '@/app/components/WeatherWidget';
import type { ImageCredit as ImageCreditData } from '@/lib/articleTypes';
import { getArticleLabel } from '@/lib/articleLabels';

type MetaItem = {
  label: string;
  value: string;
};

type ArticleHeroProps = {
  locale: string;
  title: string;
  excerpt?: string | null;
  categoryLabel?: string | null;
  featured?: boolean | null;
  metaItems: MetaItem[];
  imageUrl?: string | null;
  imageAlt: string;
  imageCredit?: ImageCreditData | null;
  breadcrumb?: React.ReactNode;
  weatherLocation?: string | null;
  regionName?: string | null;
  countryName?: string | null;
};

export default function ArticleHero({
  locale,
  title,
  excerpt,
  categoryLabel,
  featured,
  metaItems,
  imageUrl,
  imageAlt,
  imageCredit,
  breadcrumb,
  weatherLocation,
  regionName,
  countryName,
}: ArticleHeroProps) {
  return (
    <header className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl min-h-[360px] md:min-h-[420px] flex flex-col justify-between p-6 md:p-10 mb-8">
      <SafeImage
        src={imageUrl ?? '/placeholder.png'}
        alt={imageAlt}
        fill
        priority
        sizes="(max-width: 1200px) 100vw, 1360px"
        className="object-cover pointer-events-none"
        fallbackLabel={title}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40 pointer-events-none" />

      {/* Top Row: Breadcrumb & Badges */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 w-full">
        <div className="min-w-0">
          {breadcrumb}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {categoryLabel && (
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              {categoryLabel}
            </span>
          )}
          {featured && (
            <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-yellow-400">
              {getArticleLabel(locale, 'featured')}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Row: Text content */}
      <div className="relative z-10 max-w-4xl space-y-4 mt-8 md:mt-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="break-words text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl flex-1">
            {title}
          </h1>
          {weatherLocation && (
            <div className="shrink-0 self-start md:self-center">
              <WeatherWidget 
                locationName={weatherLocation} 
                fallbackLocations={[regionName, countryName].filter((item): item is string => Boolean(item))}
                dark 
              />
            </div>
          )}
        </div>

        {excerpt && (
          <p className="max-w-3xl break-words text-lg font-medium leading-relaxed text-slate-300 md:text-xl">
            {excerpt}
          </p>
        )}

        {metaItems.length > 0 && (
          <dl className="flex flex-wrap gap-2 text-sm text-slate-400">
            {metaItems.map((item) => (
              <div
                key={`${item.label}-${item.value}`}
                className="flex max-w-full items-center gap-1 rounded-full border border-white/5 bg-slate-900/60 px-3 py-1.5 shadow-sm backdrop-blur"
              >
                <dt className="font-semibold text-slate-300">{item.label}:</dt>
                <dd className="break-words text-slate-400">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </header>
  );
}
