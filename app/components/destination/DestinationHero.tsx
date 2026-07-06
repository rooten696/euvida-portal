import SafeImage from '@/app/components/SafeImage';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

type DestinationHeroProps = {
  title: string;
  description?: string | null;
  badge?: string | null;
  imageUrl?: string | null;
  imageAlt: string;
  backHref?: string | null;
  backLabel?: string | null;
  action?: ReactNode;
  flag?: string | null;
  flagSrc?: string | null;
};

export default function DestinationHero({
  title,
  description,
  badge,
  imageUrl,
  imageAlt,
  backHref,
  backLabel,
  action,
  flag,
  flagSrc,
}: DestinationHeroProps) {
  return (
    <header className="relative overflow-hidden border-b border-slate-200 bg-slate-950">
      {imageUrl && (
        <SafeImage
          src={imageUrl}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-100 dark:opacity-80"
          fallbackClassName="opacity-100 dark:opacity-80"
          fallbackLabel={title}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

      <div className="relative mx-auto flex min-h-[520px] max-w-6xl flex-col justify-between px-4 py-8 md:px-6">
        <div className="flex items-center justify-between gap-4">
          {backHref && backLabel ? (
            <Link
              href={backHref}
              className="inline-flex items-center rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-blue-950 shadow-sm backdrop-blur transition-colors hover:bg-white"
            >
              {backLabel}
            </Link>
          ) : (
            <span />
          )}
          {action}
        </div>

        <div className="max-w-4xl pb-8 pt-20 text-white">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {badge && (
              <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-yellow-950">
                {badge}
              </span>
            )}
            {(flag || flagSrc) && (
              <span className="inline-flex items-center overflow-hidden rounded-lg border border-white/25 bg-white/10 shadow-sm backdrop-blur">
                {flagSrc ? (
                  <Image
                    src={flagSrc}
                    alt={title}
                    width={48}
                    height={32}
                    className="h-8 w-12 object-cover"
                  />
                ) : (
                  <span className="px-3 py-1 text-3xl">{flag}</span>
                )}
              </span>
            )}
          </div>

          <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mt-5 max-w-3xl text-xl font-medium leading-relaxed text-white/90">
              {description}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
