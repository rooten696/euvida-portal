import Image from 'next/image';
import ImageCredit from './ImageCredit';
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

        <h1 className="break-words text-3xl font-black leading-tight text-slate-950 sm:text-4xl md:text-5xl">
          {title}
        </h1>

        {excerpt && (
          <p className="max-w-3xl break-words text-lg font-medium leading-relaxed text-slate-700 md:text-xl">
            {excerpt}
          </p>
        )}

        {metaItems.length > 0 && (
          <dl className="flex flex-wrap gap-2 text-sm text-slate-600">
            {metaItems.map((item) => (
              <div
                key={`${item.label}-${item.value}`}
                className="flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm"
              >
                <dt className="font-semibold text-slate-900">{item.label}:</dt>
                <dd className="break-words">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <figure>
        <div className="relative aspect-[16/9] max-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1120px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 via-slate-100 to-yellow-50 px-6 text-center">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                {getArticleLabel(locale, 'noImage')}
              </span>
            </div>
          )}
        </div>
        {imageUrl && <ImageCredit locale={locale} credit={imageCredit} />}
      </figure>
    </header>
  );
}
