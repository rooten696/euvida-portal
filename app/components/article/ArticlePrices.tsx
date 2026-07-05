import {
  getArticleLabel,
  getMappedLabel,
  priceCategoryLabels,
} from '@/lib/articleLabels';
import { formatDate, formatPriceItem, sortBySortOrder } from '@/lib/articleFormatting';
import { getLocalizedValue, normalizeLocale } from '@/lib/articleLocalization';
import type { PriceItem, PricesInfo, SupportedLocale } from '@/lib/articleTypes';

type ArticlePricesProps = {
  locale: string;
  pricesInfo?: PricesInfo | null;
};

type PriceGroup = {
  key: string;
  label: string | null;
  items: PriceItem[];
};

const priceCategoryOrder = [
  'ticket',
  'lift_ticket',
  'package',
  'beach_access',
  'accommodation_person',
  'accommodation_unit',
  'accommodation',
  'vehicle',
  'pet',
  'tax',
  'parking',
  'rental',
  'protective_gear',
  'activity',
  'service',
  'food_drink',
  'rules',
  'adult',
  'child',
  'reduced',
  'family',
  'locker',
  'other',
];

const otherPriceLabels: Record<SupportedLocale, string> = {
  cs: 'Další ceny',
  en: 'Other prices',
  de: 'Weitere Preise',
  fr: 'Autres tarifs',
  es: 'Otros precios',
};

function priceItemIsVisible(
  item: PriceItem,
  locale: SupportedLocale,
  fallbackCurrency?: string | null
): boolean {
  return Boolean(formatPriceItem(item, locale, fallbackCurrency));
}

function groupPriceItems(items: PriceItem[], locale: SupportedLocale): PriceGroup[] {
  const hasCategories = items.some((item) => Boolean(item.category));

  if (!hasCategories) {
    return [{ key: 'all', label: null, items }];
  }

  const groups = new Map<string, PriceGroup>();

  for (const item of items) {
    const rawCategory = item.category ?? 'other';
    const mappedLabel = getMappedLabel(priceCategoryLabels, locale, rawCategory);
    const key = mappedLabel ? rawCategory : 'other';
    const label = mappedLabel ?? otherPriceLabels[locale];

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label,
        items: [],
      });
    }

    groups.get(key)?.items.push(item);
  }

  return [...groups.values()].sort((left, right) => {
    const leftIndex = priceCategoryOrder.indexOf(left.key);
    const rightIndex = priceCategoryOrder.indexOf(right.key);

    if (leftIndex === -1 && rightIndex === -1) {
      return 0;
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
}

function PriceStatusBadge({
  officialBadge,
  official,
}: {
  officialBadge?: string | null;
  official?: boolean | null;
}) {
  if (typeof official !== 'boolean' || !officialBadge) {
    return null;
  }

  return (
    <span
      className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${
        official
          ? 'bg-green-100 text-green-800'
          : 'bg-amber-100 text-amber-800'
      }`}
    >
      {officialBadge}
    </span>
  );
}

function PriceRow({
  item,
  locale,
  fallbackCurrency,
  index,
}: {
  item: PriceItem;
  locale: SupportedLocale;
  fallbackCurrency?: string | null;
  index: number;
}) {
  const formatted = formatPriceItem(item, locale, fallbackCurrency);

  if (!formatted) {
    return null;
  }

  const { label, text, note, value: price, official, officialBadge } = formatted;

  return (
    <li className="overflow-hidden rounded-xl border border-white/5 bg-slate-800/50 p-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {label && (
              <h3 className="break-words text-sm font-bold leading-snug text-white">
                {label}
              </h3>
            )}
            <PriceStatusBadge
              official={official}
              officialBadge={officialBadge}
            />
          </div>
          {text && (
            <p className={`break-words text-sm leading-relaxed text-slate-300 ${label ? 'mt-1' : ''}`}>
              {text}
            </p>
          )}
        </div>
        {price && (
          <span className="max-w-full break-words rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-sm font-extrabold text-emerald-400 shadow-sm backdrop-blur sm:shrink-0">
            {price}
          </span>
        )}
      </div>
      {note && (
        <p className="mt-2 break-words text-sm leading-relaxed text-slate-400">
          {note}
        </p>
      )}
      {!label && !text && price && <span className="sr-only">price item {index + 1}</span>}
    </li>
  );
}

export default function ArticlePrices({ locale, pricesInfo }: ArticlePricesProps) {
  const currentLocale = normalizeLocale(locale);
  const items = sortBySortOrder(pricesInfo?.items ?? []);

  const summary = getLocalizedValue(pricesInfo?.summary, currentLocale);
  const seasonNote = getLocalizedValue(pricesInfo?.season_note, currentLocale);
  const notes = getLocalizedValue(pricesInfo?.notes, currentLocale);
  const lastChecked = formatDate(pricesInfo?.last_checked, currentLocale);
  const bookingUrl = pricesInfo?.booking_url;

  const hasContent = items.length > 0 || summary || bookingUrl;

  if (!pricesInfo || !hasContent) {
    return null;
  }

  const visibleItems = items.filter((item) =>
    priceItemIsVisible(item, currentLocale, pricesInfo.currency)
  );

  const groups = groupPriceItems(visibleItems, currentLocale);

  if (visibleItems.length === 0 && !summary && !bookingUrl) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-xl backdrop-blur">
      <h2 className="text-lg font-extrabold text-emerald-400">
        {getArticleLabel(currentLocale, 'prices')}
      </h2>

      {summary && <p className="mt-2 text-sm leading-relaxed text-slate-300">{summary}</p>}

      {bookingUrl && (
        <div className="mt-3 flex flex-wrap items-baseline gap-1 text-sm text-slate-300">
          <span className="font-bold text-white">
            {getArticleLabel(currentLocale, 'bookingUrl')}
          </span>{' '}
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline font-semibold break-all"
          >
            {bookingUrl}
          </a>
        </div>
      )}

      {seasonNote && (
        <p className="mt-3 rounded-xl bg-slate-800/50 p-3 text-sm leading-relaxed text-slate-300">
          <span className="font-bold text-white">{getArticleLabel(currentLocale, 'seasonNote')}:</span>{' '}
          {seasonNote}
        </p>
      )}

      <div className="mt-4 space-y-5">
        {groups.map((group) => (
          <section key={group.key} className="min-w-0">
            {group.label && (
              <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-emerald-400">
                {group.label}
              </h3>
            )}
            <ul className="space-y-3">
              {group.items.map((item, index) => (
                <PriceRow
                  key={item.id ?? `${item.price_type ?? 'price'}-${group.key}-${index}`}
                  item={item}
                  locale={currentLocale}
                  fallbackCurrency={pricesInfo.currency}
                  index={index}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {(notes || lastChecked) && (
        <div className="mt-4 space-y-1 border-t border-white/10 pt-4 text-sm leading-relaxed text-slate-400">
          {notes && (
            <p>
              <span className="font-semibold text-slate-300">
                {getArticleLabel(currentLocale, 'note')}:
              </span>{' '}
              {notes}
            </p>
          )}
          {lastChecked && (
            <p>
              <span className="font-semibold text-slate-300">
                {getArticleLabel(currentLocale, 'checked')}:
              </span>{' '}
              {lastChecked}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
