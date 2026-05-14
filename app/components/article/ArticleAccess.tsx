import {
  accessModeLabels,
  getArticleLabel,
  getMappedLabel,
  recommendedLabels,
} from '@/lib/articleLabels';
import { sortBySortOrder, toNumber } from '@/lib/articleFormatting';
import { getLocalizedValue, normalizeLocale } from '@/lib/articleLocalization';
import type { AccessInfo, AccessItem } from '@/lib/articleTypes';

type ArticleAccessProps = {
  locale: string;
  accessInfo?: AccessInfo | null;
};

type Detail = {
  label: string;
  value: string;
};

function accessItemLabel(item: AccessItem, locale: string): string | null {
  return getLocalizedValue(item.label, locale) ?? getMappedLabel(accessModeLabels, locale, item.mode);
}

function AccessRow({ item, locale }: { item: AccessItem; locale: string }) {
  const label = accessItemLabel(item, locale);
  const description = getLocalizedValue(item.description, locale);
  const note = getLocalizedValue(item.note, locale);
  const walkMinutes = toNumber(item.walk_minutes);
  const destination = getLocalizedValue(item.destination, locale);

  const details: Detail[] = [
    item.lines && item.lines.length > 0
      ? { label: getArticleLabel(locale, 'lines'), value: item.lines.join(', ') }
      : null,
    item.stop_name ? { label: getArticleLabel(locale, 'stop'), value: item.stop_name } : null,
    walkMinutes !== null
      ? { label: getArticleLabel(locale, 'walk'), value: `${walkMinutes} min` }
      : null,
    typeof item.parking_available === 'boolean'
      ? {
          label: getArticleLabel(locale, 'parking'),
          value: getArticleLabel(locale, item.parking_available ? 'yes' : 'no'),
        }
      : null,
    item.roads && item.roads.length > 0
      ? { label: getArticleLabel(locale, 'roads'), value: item.roads.join(', ') }
      : null,
    destination ? { label: getArticleLabel(locale, 'destination'), value: destination } : null,
  ].filter((detail): detail is Detail => Boolean(detail));

  if (!label && !description && details.length === 0 && !note) {
    return null;
  }

  return (
    <li className="border-b border-yellow-100 pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          {label && (
            <h3 className="text-sm font-bold leading-snug text-slate-950">
              {label}
            </h3>
          )}
          {description && (
            <p className={`text-sm leading-relaxed text-slate-700 ${label ? 'mt-1' : ''}`}>
              {description}
            </p>
          )}
        </div>
        {item.recommended && (
          <span className="shrink-0 rounded-full bg-yellow-300 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-yellow-950">
            {recommendedLabels[normalizeLocale(locale)]}
          </span>
        )}
      </div>

      {details.length > 0 && (
        <dl className="mt-3 grid gap-2 rounded-xl bg-white/70 p-3 text-xs text-slate-700">
          {details.map((detail) => (
            <div key={`${detail.label}-${detail.value}`} className="flex gap-2">
              <dt className="shrink-0 font-bold text-slate-950">{detail.label}:</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {note && <p className="mt-2 text-xs leading-relaxed text-yellow-900/85">{note}</p>}
    </li>
  );
}

export default function ArticleAccess({ locale, accessInfo }: ArticleAccessProps) {
  const currentLocale = normalizeLocale(locale);
  const items = sortBySortOrder(accessInfo?.items ?? []);

  if (!accessInfo || items.length === 0) {
    return null;
  }

  const visibleItems = items.filter((item) =>
    Boolean(
      accessItemLabel(item, currentLocale) ||
      getLocalizedValue(item.description, currentLocale) ||
      getLocalizedValue(item.note, currentLocale) ||
      item.lines?.length ||
      item.stop_name ||
      item.walk_minutes ||
      typeof item.parking_available === 'boolean' ||
      item.roads?.length ||
      getLocalizedValue(item.destination, currentLocale)
    )
  );

  if (visibleItems.length === 0) {
    return null;
  }

  const summary = getLocalizedValue(accessInfo.summary, currentLocale);
  const notes = getLocalizedValue(accessInfo.notes, currentLocale);

  return (
    <section className="rounded-2xl border border-yellow-100 bg-yellow-50/70 p-5 shadow-sm">
      <h2 className="text-lg font-extrabold text-yellow-950">
        {getArticleLabel(currentLocale, 'access')}
      </h2>

      {summary && <p className="mt-2 text-sm leading-relaxed text-slate-700">{summary}</p>}

      <ul className="mt-4 space-y-4">
        {visibleItems.map((item, index) => (
          <AccessRow key={item.id ?? `${item.mode ?? 'access'}-${index}`} item={item} locale={currentLocale} />
        ))}
      </ul>

      {notes && (
        <p className="mt-4 border-t border-yellow-100 pt-4 text-xs leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">
            {getArticleLabel(currentLocale, 'note')}:
          </span>{' '}
          {notes}
        </p>
      )}
    </section>
  );
}
