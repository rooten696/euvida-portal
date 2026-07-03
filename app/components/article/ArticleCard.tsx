import type { ArticleCardData } from '@/lib/articleCards';
import { getArticleLabel } from '@/lib/articleLabels';
import { getDestinationLabel } from '@/lib/destinationLabels';
import SafeImage from '@/app/components/SafeImage';
import Link from 'next/link';

type ArticleCardProps = {
  article: ArticleCardData;
  locale: string;
  country?: string | null;
  region?: string | null;
  priority?: boolean;
  showFeaturedBadge?: boolean;
};

function locationLabel(
  article: ArticleCardData,
  country?: string | null,
  region?: string | null
): string | null {
  const countryName = country ?? article.countryName;
  const regionName = region ?? article.regionName;

  if (regionName && countryName) {
    return `${regionName}, ${countryName}`;
  }

  return regionName ?? countryName ?? null;
}

export default function ArticleCard({
  article,
  locale,
  country,
  region,
  priority = false,
  showFeaturedBadge = true,
}: ArticleCardProps) {
  const location = locationLabel(article, country, region);

  return (
    <Link
      href={`/${locale}/article/${article.slug}`}
      className="group flex min-h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-slate-900/50 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-800">
        {article.imageUrl ? (
          <SafeImage
            src={article.imageUrl}
            alt={article.imageAlt}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fallbackLabel={article.categoryLabel ?? 'Euvida'}
          />
        ) : (
          <div className="relative flex h-full items-center justify-center overflow-hidden bg-slate-900 px-5 text-center">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#064e3b_0%,#0f766e_38%,#042f2e_100%)]" />
            <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(120deg,rgba(15,23,42,0.08)_0_1px,transparent_1px_18px)]" />
            <div className="relative rounded-full border border-white/10 bg-black/30 px-4 py-2 shadow-sm backdrop-blur">
              <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-400">
                Euvida
              </span>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-transparent" />
        {(article.categoryLabel || (article.featured && showFeaturedBadge)) && (
          <div className="absolute left-4 right-4 top-4 flex flex-wrap items-start justify-between gap-2">
            {article.categoryLabel && (
              <span className="max-w-full rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-400 border border-emerald-500/30 shadow-sm backdrop-blur">
                {article.categoryLabel}
              </span>
            )}
            {article.featured && showFeaturedBadge && (
              <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-slate-950 shadow-sm">
                {getArticleLabel(locale, 'featured')}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {location && (
          <p className="mb-2 break-words text-xs font-bold uppercase tracking-wide text-emerald-500">
            {location}
          </p>
        )}
        <h3 className="line-clamp-2 break-words text-xl font-extrabold leading-tight text-white transition-colors group-hover:text-emerald-400">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-3 line-clamp-3 flex-1 break-words text-sm leading-relaxed text-slate-400">
            {article.excerpt}
          </p>
        )}
        <div className="mt-5 flex items-center justify-between gap-3 text-sm">
          <span className="font-bold text-emerald-500 group-hover:text-emerald-400">
            {getDestinationLabel(locale, 'readMore')}
          </span>
          {article.readingTimeMinutes && (
            <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-400">
              {article.readingTimeMinutes} min
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
