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
    <div className="relative mb-8 min-h-[560px] overflow-hidden rounded-3xl border border-white/10 bg-[#020617] p-6 shadow-2xl shadow-slate-950/30 md:min-h-[620px] md:p-10">
      {/* Background Image / Gradient */}
      <div className="absolute inset-0 z-0">
        {hasHeroImage ? (
          <>
            <SafeImage
              src={heroImageSrc}
              alt={imageAlt}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-100"
              fallbackClassName=""
              fallbackLabel={imageAlt}
              fallbackSrc={heroFallbackSrc}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#064e3b_0%,#0f766e_38%,#042f2e_100%)] opacity-30" />
        )}
      </div>

      {/* Top Row: Breadcrumb & Featured */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
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
      <div className="relative z-10 mt-16 max-w-4xl space-y-4 md:mt-24">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="break-words text-3xl font-black leading-tight text-[#f8fafc] drop-shadow-[0_4px_18px_rgba(2,6,23,0.9)] sm:text-4xl md:text-5xl flex-1">
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
          <p className="max-w-3xl break-words text-lg font-medium leading-relaxed text-[#f8fafc] drop-shadow-[0_3px_14px_rgba(2,6,23,0.9)] md:text-xl">
            {excerpt}
          </p>
        )}

        {metaItems.length > 0 && (
          <dl className="flex flex-wrap gap-2 text-sm text-[#94a3b8]">
            {metaItems.map((item) => (
              <div
                key={`${item.label}-${item.value}`}
                className="flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-[#0f172a]/65 px-3 py-1.5 shadow-sm backdrop-blur"
              >
                <dt className="font-semibold text-[#cbd5e1]">{item.label}:</dt>
                <dd className="break-words text-[#94a3b8]">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
