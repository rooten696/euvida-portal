import SafeImage from '@/app/components/SafeImage';
import Image from 'next/image';
import Link from 'next/link';

type DestinationCardProps = {
  href: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt: string;
  badge?: string | null;
  flag?: string | null;
  flagSrc?: string | null;
  stats?: { label: string; value: number | string }[];
  actionLabel: string;
};

export default function DestinationCard({
  href,
  title,
  description,
  imageUrl,
  imageAlt,
  badge,
  flag,
  flagSrc,
  stats,
  actionLabel,
}: DestinationCardProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-slate-900/50 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-800">
        {imageUrl ? (
          <SafeImage
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fallbackLabel={badge ?? 'Euvida'}
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#064e3b_0%,#0f766e_40%,#042f2e_100%)]" />
        )}
        {!imageUrl && (
          <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(120deg,rgba(15,23,42,0.08)_0_1px,transparent_1px_18px)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <h3 className="break-words text-2xl font-extrabold leading-tight text-white drop-shadow">
            {title}
          </h3>
          {(flag || flagSrc) && (
            <span className="shrink-0 overflow-hidden rounded-md border border-white/30 bg-white/10 shadow backdrop-blur">
              {flagSrc ? (
                <Image
                  src={flagSrc}
                  alt={title}
                  width={42}
                  height={28}
                  className="h-7 w-[42px] object-cover"
                />
              ) : (
                <span className="block px-2 py-1 text-2xl">{flag}</span>
              )}
            </span>
          )}
        </div>
        {badge && (
          <span className="absolute left-4 top-4 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-400 border border-emerald-500/30 backdrop-blur">
            {badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {description && (
          <p className="line-clamp-3 flex-1 break-words text-sm leading-relaxed text-slate-400">
            {description}
          </p>
        )}
        {stats && stats.length > 0 && (
          <dl className="mt-5 grid grid-cols-2 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/5 px-3 py-2">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {stat.label}
                </dt>
                <dd className="mt-0.5 text-lg font-black text-white">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-5 text-sm font-bold text-emerald-500 transition-colors group-hover:text-emerald-400">
          {actionLabel}
        </div>
      </div>
    </Link>
  );
}
