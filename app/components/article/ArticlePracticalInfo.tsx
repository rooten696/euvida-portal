import { getArticleLabel, practicalLabels } from '@/lib/articleLabels';
import { stripLeadingListMarkers } from '@/lib/articleFormatting';
import { getLocalizedPracticalInfo, normalizeLocale } from '@/lib/articleLocalization';
import type { PracticalInfoKey, PracticalInfoLocales } from '@/lib/articleTypes';

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
    .map(([key, value]) => {
      if (!value || typeof value !== 'string' || value.trim().length === 0) {
        return null;
      }

      // Try to find a translated label in practicalLabels, otherwise capitalize the key
      const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, '_');
      const labelFromMap = (practicalLabels[currentLocale] as any)[normalizedKey] || (practicalLabels[currentLocale] as any)[key];
      const label = labelFromMap ?? (key.charAt(0).toUpperCase() + key.slice(1));

      return {
        key,
        label,
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
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-300">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
