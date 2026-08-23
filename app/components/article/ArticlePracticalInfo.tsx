import { getArticleLabel, practicalLabels } from '@/lib/articleLabels';
import { stripLeadingListMarkers } from '@/lib/articleFormatting';
import { getLocalizedPracticalInfo, normalizeLocale } from '@/lib/articleLocalization';
import type { PracticalInfoKey, PracticalInfoLocales, SupportedLocale } from '@/lib/articleTypes';

type ArticlePracticalInfoProps = {
  locale: string;
  practicalInfo?: PracticalInfoLocales | null;
};

const practicalOrder: PracticalInfoKey[] = [
  'best_time',
  'time_needed',
  'booking',
  'crowds',
  'transport',
  'nearby_prices',
  'watch_out',
  'accessibility',
];

function normalizeInfoKey(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/__+/g, '_')
    .toLowerCase();
}

function humanizeInfoKey(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

function getPracticalLabel(locale: SupportedLocale, key: string): string {
  const normalizedKey = normalizeInfoKey(key);
  return (
    practicalLabels[locale]?.[normalizedKey] ??
    practicalLabels[locale]?.[key] ??
    practicalLabels.cs[normalizedKey] ??
    practicalLabels.cs[key] ??
    humanizeInfoKey(key)
  );
}

export default function ArticlePracticalInfo({
  locale,
  practicalInfo,
}: ArticlePracticalInfoProps) {
  const currentLocale = normalizeLocale(locale);
  const localizedInfo = getLocalizedPracticalInfo(practicalInfo, currentLocale);

  if (!localizedInfo) {
    return null;
  }

  const rows = Object.entries(localizedInfo)
    .filter(([key]) => key.toLowerCase() !== 'booking_url')
    .map(([key, value]) => {
      if (!value || typeof value !== 'string' || value.trim().length === 0) {
        return null;
      }

      return {
        key,
        label: getPracticalLabel(currentLocale, key),
        value: stripLeadingListMarkers(value),
      };
    })
    .filter((row): row is { key: string; label: string; value: string } => Boolean(row));

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-xl backdrop-blur">
      <h2 className="mb-4 text-lg font-extrabold text-white">
        {getArticleLabel(currentLocale, 'practicalInfo')}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {rows.map((row) => (
          <div key={row.key} className="rounded-xl border border-white/5 bg-slate-800/50 p-3">
            <h3 className="text-sm font-bold text-white">{row.label}</h3>
            {row.key.toLowerCase().endsWith('_url') ? (
              <a
                href={row.value}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-sm font-semibold text-emerald-400 hover:text-emerald-300 underline break-all"
              >
                {row.value}
              </a>
            ) : (
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                {row.value}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
