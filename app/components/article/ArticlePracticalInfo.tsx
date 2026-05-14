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

  const rows = practicalOrder
    .map((key) => {
      const value = localizedInfo[key];

      if (!value || value.trim().length === 0) {
        return null;
      }

      return {
        key,
        label: practicalLabels[currentLocale][key],
        value: stripLeadingListMarkers(value),
      };
    })
    .filter((row): row is { key: PracticalInfoKey; label: string; value: string } => Boolean(row));

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-extrabold text-slate-950">
        {getArticleLabel(currentLocale, 'practicalInfo')}
      </h2>
      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={row.key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <h3 className="text-sm font-bold text-slate-950">{row.label}</h3>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
