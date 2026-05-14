import Image from 'next/image';
import type { ImageCredit } from '@/lib/articleTypes';
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
  imageCredit?: ImageCredit | null;
};

function CreditPart({ label, url }: { label: string; url?: string | null }) {
  if (!url) {
    return <span>{label}</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="underline decoration-white/40 underline-offset-2 transition-colors hover:text-white"
    >
      {label}
    </a>
  );
}

function ImageCreditLine({
  locale,
  credit,
}: {
  locale: string;
  credit?: ImageCredit | null;
}) {
  if (!credit) {
    return null;
  }

  const sourceLabel = credit.source_name ?? credit.source ?? credit.source_url ?? null;
  const parts: { label: string; url?: string | null }[] = [];

  if (credit.author_name) {
    parts.push({ label: credit.author_name, url: credit.author_url });
  }

  if (credit.license_name) {
    parts.push({ label: credit.license_name, url: credit.license_url });
  }

  if (sourceLabel) {
    parts.push({ label: sourceLabel, url: credit.source_url });
  }

  if (parts.length === 0) {
    return null;
  }

  return (
    <figcaption className="absolute bottom-3 right-3 max-w-[calc(100%-1.5rem)] rounded-lg bg-slate-950/65 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
      <span className="font-semibold text-white">{getArticleLabel(locale, 'photo')}:</span>{' '}
      {parts.map((part, index) => (
        <span key={`${part.label}-${index}`}>
          {index > 0 && ', '}
          <CreditPart label={part.label} url={part.url} />
        </span>
      ))}
    </figcaption>
  );
}

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
}: ArticleHeroProps) {
  return (
    <header className="space-y-7">
      <div className="max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {categoryLabel && (
            <span className="rounded-full bg-blue-900 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              {categoryLabel}
            </span>
          )}
          {featured && (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-yellow-900">
              {getArticleLabel(locale, 'featured')}
            </span>
          )}
        </div>

        <h1 className="text-4xl font-black leading-tight text-slate-950 md:text-6xl">
          {title}
        </h1>

        {excerpt && (
          <p className="max-w-3xl text-xl font-medium leading-relaxed text-slate-600 md:text-2xl">
            {excerpt}
          </p>
        )}

        {metaItems.length > 0 && (
          <dl className="flex flex-wrap gap-2 text-sm text-slate-600">
            {metaItems.map((item) => (
              <div
                key={`${item.label}-${item.value}`}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm"
              >
                <dt className="font-semibold text-slate-900">{item.label}:</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {imageUrl && (
        <figure className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            priority
            sizes="(max-width: 1200px) 100vw, 1120px"
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/55 to-transparent" />
          <ImageCreditLine locale={locale} credit={imageCredit} />
        </figure>
      )}
    </header>
  );
}
