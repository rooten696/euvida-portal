import { getArticleLabel, getMappedLabel, sourceTypeLabels } from '@/lib/articleLabels';
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
  const sourceType = getMappedLabel(sourceTypeLabels, locale, source.type);
  const usedFor = source.used_for
    ?.filter((item) => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.replace(/_/g, ' '))
    .join(', ');

  if (!label || !source.url) {
    return null;
  }

  return (
    <li className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-blue-800 underline decoration-blue-200 underline-offset-2 hover:text-blue-950"
        >
          {label}
        </a>
        {sourceType && (
          <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            {sourceType}
          </span>
        )}
      </div>
      {usedFor && (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          <span className="font-semibold">{getArticleLabel(locale, 'usedFor')}:</span>{' '}
          {usedFor}
        </p>
      )}
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
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-extrabold text-slate-950">
        {getArticleLabel(currentLocale, 'sources')}
      </h2>

      {checkedDate && (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">
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
