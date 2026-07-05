import { getArticleLabel } from '@/lib/articleLabels';
import { formatDate } from '@/lib/articleFormatting';
import { getLocalizedValue, normalizeLocale } from '@/lib/articleLocalization';
import type { SourceInfo, SourceItem } from '@/lib/articleTypes';

type ArticleSourcesProps = {
  locale: string;
  sourceInfo?: SourceInfo | null;
  lastCheckedAt?: string | null;
};

function getHostname(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function SourceLink({
  source,
  locale,
}: {
  source: SourceItem;
  locale: string;
}) {
  const label = getLocalizedValue(source.label, locale) ?? getHostname(source.url);

  if (!label || !source.url) {
    return null;
  }

  return (
    <li className="rounded-xl border border-white/5 bg-slate-800/50 p-3">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-emerald-400 underline decoration-emerald-500/30 underline-offset-2 hover:text-emerald-300"
      >
        {label}
      </a>
    </li>
  );
}

export default function ArticleSources({
  locale,
  sourceInfo,
  lastCheckedAt,
}: ArticleSourcesProps) {
  const currentLocale = normalizeLocale(locale);
  const checkedDate = formatDate(lastCheckedAt ?? sourceInfo?.last_checked, currentLocale);
  const sources = sourceInfo?.sources ?? [];
  const visibleSources = sources.filter((source) =>
    Boolean(source.url && (getLocalizedValue(source.label, currentLocale) || getHostname(source.url)))
  );

  if (!checkedDate && visibleSources.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur">
      <h2 className="text-xl font-extrabold text-white">
        {getArticleLabel(currentLocale, 'sources')}
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        {getArticleLabel(currentLocale, 'sourcesIntro')}
      </p>

      {checkedDate && (
        <p className="mt-2 text-sm text-slate-400">
          <span className="font-semibold text-slate-200">
            {getArticleLabel(currentLocale, 'infoChecked')}:
          </span>{' '}
          {checkedDate}
        </p>
      )}

      {visibleSources.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {visibleSources.map((source, index) => (
            <SourceLink key={`${source.url}-${index}`} source={source} locale={currentLocale} />
          ))}
        </ul>
      )}
    </section>
  );
}
