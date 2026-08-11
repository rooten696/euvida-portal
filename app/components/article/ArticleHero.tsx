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
  const hasHeroImage = Boolean(imageUrl || fallbackImageUrl);
  const heroImageSrc = imageUrl ?? fallbackImageUrl ?? '/placeholder.png';
  const heroFallbackSrc = fallbackImageUrl ?? '/placeholder.png';

  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-slate-950/30 p-0 md:p-10">
      {/* Background Image / Gradient */}
      <div className="absolute inset-0 z-0 hidden md:block">
        {hasHeroImage ? (
          <>
            <SafeImage
              src={heroImageSrc}
              alt={imageAlt}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-60"
              fallbackClassName=""
              fallbackLabel={imageAlt}
              fallbackSrc={heroFallbackSrc}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/35 to-slate-950/10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#064e3b_0%,#0f766e_38%,#042f2e_100%)] opacity-30" />
        )}
      </div>

      {hasHeroImage && (
        <div className="relative z-10 mx-3 mt-3 overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-900 shadow-xl shadow-slate-950/25 md:hidden">
          <div className="relative aspect-[16/10] w-full">
            <SafeImage
              src={heroImageSrc}
              alt={imageAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 0px"
              className="object-cover"
              fallbackClassName=""
              fallbackLabel={imageAlt}
              fallbackSrc={heroFallbackSrc}
            />
          </div>
        </div>
      )}

      {/* Top Row: Breadcrumb & Featured */}
      <div className="relative z-10 mx-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-2 pb-4 pt-5 md:mx-0 md:px-0 md:pt-0">
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
      <div className="relative z-10 mx-4 mt-6 max-w-4xl space-y-4 px-2 pb-6 md:mx-0 md:mt-16 md:px-0 md:pb-0">
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
