import { getArticleLabel, recommendedLabels } from '@/lib/articleLabels';
import { getBooleanLabel, getModeLabel } from '@/lib/articleDisplay';
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

const rawAccessLabels: Record<string, string[]> = {
  car: ['auto', 'car'],
  bike: ['kolo', 'bike'],
  public_transport: ['mhd', 'public transport', 'verejna doprava', 'veřejná doprava'],
  train: ['vlak', 'train'],
  bus: ['bus', 'autobus'],
  boat: ['lod', 'loď', 'boat'],
  walk: ['pesky', 'pěšky', 'walk'],
};

function normalizeAccessLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isRawAccessLabel(label: string, mode: string | null | undefined): boolean {
  if (!mode) {
    return false;
  }

  const normalizedLabel = normalizeAccessLabel(label);
  const normalizedMode = normalizeAccessLabel(mode.replace(/_/g, ' '));
  const knownLabels = rawAccessLabels[mode]?.map(normalizeAccessLabel) ?? [];

  return normalizedLabel === normalizedMode || knownLabels.includes(normalizedLabel);
}

function ModeIcon({ mode }: { mode?: string | null }) {
  const normalizedMode = mode ?? 'other';

  return (
    <span
      className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-emerald-400 shadow-sm ring-1 ring-white/10"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        {normalizedMode === 'car' || normalizedMode === 'parking' ? (
          <>
            <path d="M5 13l1.4-4.2A3 3 0 0 1 9.2 7h5.6a3 3 0 0 1 2.8 1.8L19 13" />
            <path d="M4 13h16v4H4z" />
            <path d="M7 17v1.5M17 17v1.5" />
            <path d="M7.5 14.5h.1M16.4 14.5h.1" />
          </>
        ) : normalizedMode === 'bus' || normalizedMode === 'public_transport' ? (
          <>
            <rect x="5" y="4" width="14" height="13" rx="2" />
            <path d="M8 8h8M8 12h8M8 17v2M16 17v2" />
          </>
        ) : normalizedMode === 'train' || normalizedMode === 'train_bus' ? (
          <>
            <rect x="6" y="3" width="12" height="14" rx="2" />
            <path d="M9 7h6M9 12h.1M15 12h.1M8 21l3-4M16 21l-3-4" />
          </>
        ) : normalizedMode === 'bike' ? (
          <>
            <circle cx="7" cy="16" r="3" />
            <circle cx="17" cy="16" r="3" />
            <path d="M9.5 16l2.5-6 2.5 6M10.5 10h3.5M12 10l-2.5 6M12 10l5 6" />
          </>
        ) : normalizedMode === 'boat' || normalizedMode === 'ferry' ? (
          <>
            <path d="M5 13l2-6h10l2 6" />
            <path d="M4 14h16l-2 4H6z" />
            <path d="M7 20c1 0 1.5-.6 2.5-.6S11 20 12 20s1.5-.6 2.5-.6S16 20 17 20" />
          </>
        ) : normalizedMode === 'walk' ? (
          <>
            <circle cx="13" cy="5" r="1.8" />
            <path d="M10 21l2-6-2-3M12 9l3 2 2 4M12 9l-2 3-3 1" />
          </>
        ) : (
          <>
            <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z" />
            <circle cx="12" cy="10" r="2" />
          </>
        )}
      </svg>
    </span>
  );
}

function accessItemLabel(item: AccessItem, locale: string): string | null {
  const label = getLocalizedValue(item.label, locale);
  const modeLabel = getModeLabel(item.mode, locale);

  if (modeLabel && (!label || isRawAccessLabel(label, item.mode))) {
    return modeLabel;
  }

  return label ?? modeLabel;
}

function AccessRow({ item, locale }: { item: AccessItem; locale: string }) {
  const label = accessItemLabel(item, locale);
  const modeLabel = getModeLabel(item.mode, locale);
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
          value: getBooleanLabel(item.parking_available, locale) ?? '',
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
    <li className="border-b border-white/5 pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ModeIcon mode={item.mode} />
          <div className="min-w-0">
            {label && (
              <h3 className="break-words text-sm font-bold leading-snug text-white">
                {label}
              </h3>
            )}
            {modeLabel && modeLabel !== label && (
              <span className="mt-1 inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-400 shadow-sm">
                {modeLabel}
              </span>
            )}
            {description && (
              <p className={`break-words text-sm leading-relaxed text-slate-300 ${label ? 'mt-1' : ''}`}>
                {description}
              </p>
            )}
          </div>
        </div>
        {item.recommended && (
          <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-emerald-400">
            {recommendedLabels[normalizeLocale(locale)]}
          </span>
        )}
      </div>

      {details.length > 0 && (
        <dl className="mt-3 grid gap-2 rounded-xl bg-slate-800/50 p-3 text-sm text-slate-300">
          {details.map((detail) => (
            <div key={`${detail.label}-${detail.value}`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
              <dt className="font-bold text-slate-400">{detail.label}:</dt>
              <dd className="break-words">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {note && <p className="mt-2 break-words text-sm leading-relaxed text-slate-400">{note}</p>}
    </li>
  );
}

export default function ArticleAccess({ locale, accessInfo }: ArticleAccessProps) {
  const currentLocale = normalizeLocale(locale);
  let items = sortBySortOrder(accessInfo?.items ?? []);

  // Simple format fallback (where keys are locale names e.g. 'cs', 'en')
  if ((!items || items.length === 0) && accessInfo) {
    const localeData = (accessInfo as any)[currentLocale] || (accessInfo as any)['cs'] || (accessInfo as any)['en'];
    if (localeData && typeof localeData === 'object') {
      const parsedItems: AccessItem[] = [];
      
      if (localeData.address) {
        parsedItems.push({
          mode: 'address',
          label: {
            cs: 'Address',
            en: 'Address',
            de: 'Adresse',
            fr: 'Adresse',
            es: 'Dirección'
          },
          description: { [currentLocale]: localeData.address }
        });
      }
      if (localeData.parking) {
        parsedItems.push({
          mode: 'parking',
          label: {
            cs: 'Parkování',
            en: 'Parking',
            de: 'Parken',
            fr: 'Stationnement',
            es: 'Aparcamiento'
          },
          description: { [currentLocale]: localeData.parking }
        });
      }
      if (localeData.public_transport) {
        parsedItems.push({
          mode: 'public_transport',
          label: {
            cs: 'Doprava a MHD',
            en: 'Public transport',
            de: 'ÖPNV',
            fr: 'Transports publics',
            es: 'Transporte público'
          },
          description: { [currentLocale]: localeData.public_transport }
        });
      }
      items = parsedItems;
    }
  }

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
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-xl backdrop-blur">
      <h2 className="text-lg font-extrabold text-emerald-400">
        {getArticleLabel(currentLocale, 'access')}
      </h2>

      {summary && <p className="mt-2 text-sm leading-relaxed text-slate-300">{summary}</p>}

      <ul className="mt-4 space-y-4">
        {visibleItems.map((item, index) => (
          <AccessRow key={item.id ?? `${item.mode ?? 'access'}-${index}`} item={item} locale={currentLocale} />
        ))}
      </ul>

      {notes && (
        <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-relaxed text-slate-400">
          <span className="font-semibold text-slate-300">
            {getArticleLabel(currentLocale, 'note')}:
          </span>{' '}
          {notes}
        </p>
      )}
    </section>
  );
}
