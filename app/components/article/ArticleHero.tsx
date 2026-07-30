import SafeImage from '@/app/components/SafeImage';
import ImageCredit from './ImageCredit';
import WeatherWidget from '@/app/components/WeatherWidget';
import FavoriteButton from '@/app/components/FavoriteButton';
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
  fallbackImageUrl?: string | null;
  imageAlt: string;
  imageCredit?: ImageCreditData | null;
  breadcrumb?: React.ReactNode;
  weatherLocation?: string | null;
  gpsCoords?: string | null;
  regionName?: string | null;
  countryName?: string | null;
  articleSlug?: string | null;
};

export default function ArticleHero({
  locale,
  title,
  excerpt,
  categoryLabel,
  featured,
  metaItems,
  imageUrl,
  fallbackImageUrl,
  imageAlt,
  imageCredit,
  breadcrumb,
  weatherLocation,
  gpsCoords,
  regionName,
  countryName,
  articleSlug,
}: ArticleHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 shadow-2xl p-6 md:p-10 mb-8">
      {/* Background Image / Gradient */}
      <div className="absolute inset-0 z-0">
        {imageUrl || fallbackImageUrl ? (
          <>
            <SafeImage
              src={imageUrl ?? fallbackImageUrl ?? '/placeholder.png'}
              alt={imageAlt}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-35"
              fallbackClassName=""
              fallbackLabel={imageAlt}
              fallbackSrc={fallbackImageUrl ?? '/placeholder.png'}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#064e3b_0%,#0f766e_38%,#042f2e_100%)] opacity-30" />
        )}
      </div>

      {/* Top Row: Breadcrumb & Featured */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        {breadcrumb}
        <div className="flex items-center gap-2">
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
          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-center">
            {(weatherLocation || gpsCoords) && (
              <WeatherWidget 
                locationName={weatherLocation} 
                gps={gpsCoords}
                fallbackLocations={[regionName, countryName].filter((item): item is string => Boolean(item))}
                dark 
              />
            )}
            {articleSlug && (
              <FavoriteButton articleSlug={articleSlug} locale={locale} />
            )}
          </div>
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
    </div>
  );
}
