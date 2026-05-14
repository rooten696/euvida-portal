import {
  crowdLevelLabels,
  getArticleLabel,
  getDurationLabel,
  getMappedLabel,
  placeTypeLabels,
  swimmingTypeLabels,
  timeKeyLabels,
} from '@/lib/articleLabels';
import { formatDurationRange, normalizeStringArray } from '@/lib/articleFormatting';
import { getLocalizedValue, normalizeLocale } from '@/lib/articleLocalization';
import type { VisitInfo } from '@/lib/articleTypes';

type ArticleQuickInfoProps = {
  locale: string;
  visitInfo?: VisitInfo | null;
};

type QuickInfoRow = {
  label: string;
  value: string;
};

function booleanLabel(value: boolean, locale: string): string {
  return getArticleLabel(locale, value ? 'yes' : 'no');
}

function mapKeyList(values: string[] | string | null | undefined, locale: string): string | null {
  const mapped = normalizeStringArray(values)
    .map((value) => getMappedLabel(timeKeyLabels, locale, value))
    .filter((value): value is string => Boolean(value));

  return mapped.length > 0 ? mapped.join(', ') : null;
}

export default function ArticleQuickInfo({ locale, visitInfo }: ArticleQuickInfoProps) {
  if (!visitInfo) {
    return null;
  }

  const currentLocale = normalizeLocale(locale);
  const duration = formatDurationRange(
    visitInfo.recommended_time_minutes_min,
    visitInfo.recommended_time_minutes_max,
    currentLocale
  );

  const rows: QuickInfoRow[] = [
    {
      label: getArticleLabel(currentLocale, 'placeType'),
      value: getMappedLabel(placeTypeLabels, currentLocale, visitInfo.place_type) ?? '',
    },
    {
      label: getDurationLabel(currentLocale, visitInfo.place_type),
      value: duration ?? '',
    },
    {
      label: getArticleLabel(currentLocale, 'crowdLevel'),
      value: getMappedLabel(crowdLevelLabels, currentLocale, visitInfo.crowd_level) ?? '',
    },
    {
      label: getArticleLabel(currentLocale, 'bookingRecommended'),
      value:
        typeof visitInfo.booking_recommended === 'boolean'
          ? booleanLabel(visitInfo.booking_recommended, currentLocale)
          : '',
    },
    {
      label: getArticleLabel(currentLocale, 'onlineOnly'),
      value:
        typeof visitInfo.tickets_online_only === 'boolean'
          ? booleanLabel(visitInfo.tickets_online_only, currentLocale)
          : '',
    },
    {
      label: getArticleLabel(currentLocale, 'bestTime'),
      value: mapKeyList(visitInfo.best_time_keys, currentLocale) ?? '',
    },
    {
      label: getArticleLabel(currentLocale, 'avoidIfPossible'),
      value: mapKeyList(visitInfo.avoid_if_possible_keys, currentLocale) ?? '',
    },
    {
      label: getArticleLabel(currentLocale, 'swimmingType'),
      value: getMappedLabel(swimmingTypeLabels, currentLocale, visitInfo.swimming_type) ?? '',
    },
    {
      label: getArticleLabel(currentLocale, 'officialHours'),
      value: getLocalizedValue(visitInfo.official_opening_hours, currentLocale) ?? '',
    },
    {
      label: getArticleLabel(currentLocale, 'waterQuality'),
      value: getLocalizedValue(visitInfo.water_quality_note, currentLocale) ?? '',
    },
  ].filter((row) => row.value.length > 0);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-extrabold text-blue-950">
        {getArticleLabel(currentLocale, 'quickInfo')}
      </h2>
      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl bg-white/75 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-blue-700">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm font-semibold leading-relaxed text-slate-900">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
