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
  'beach_access',
  'parking',
  'rental',
  'activity',
  'service',
  'food_drink',
  'accommodation',
  'rules',
];

function priceItemIsVisible(
  item: PriceItem,
  locale: SupportedLocale,
  fallbackCurrency?: string | null
): boolean {
  return Boolean(formatPriceItem(item, locale, fallbackCurrency));
}

function groupPriceItems(items: PriceItem[], locale: SupportedLocale): PriceGroup[] {
  const groups = new Map<string, PriceGroup>();

  for (const item of items) {
    const rawCategory = item.category ?? 'other';
    const label = getMappedLabel(priceCategoryLabels, locale, rawCategory);
    const key = label ? rawCategory : 'other';

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
    <li className="overflow-hidden rounded-xl border border-green-100 bg-white/85 p-3 shadow-sm shadow-green-950/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {label && (
              <h3 className="break-words text-sm font-bold leading-snug text-slate-950">
                {label}
              </h3>
            )}
            <PriceStatusBadge
              official={official}
              officialBadge={officialBadge}
            />
          </div>
          {text && (
            <p className={`break-words text-sm leading-relaxed text-slate-700 ${label ? 'mt-1' : ''}`}>
              {text}
            </p>
          )}
        </div>
        {price && (
          <span className="max-w-full break-words rounded-full bg-green-900 px-3 py-1 text-sm font-extrabold text-white shadow-sm sm:shrink-0">
            {price}
          </span>
        )}
      </div>
      {note && (
        <p className="mt-2 break-words text-sm leading-relaxed text-green-900/85">
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

  if (!pricesInfo || items.length === 0) {
    return null;
  }

  const visibleItems = items.filter((item) =>
    priceItemIsVisible(item, currentLocale, pricesInfo.currency)
  );

  if (visibleItems.length === 0) {
    return null;
  }

  const summary = getLocalizedValue(pricesInfo.summary, currentLocale);
  const seasonNote = getLocalizedValue(pricesInfo.season_note, currentLocale);
  const notes = getLocalizedValue(pricesInfo.notes, currentLocale);
  const lastChecked = formatDate(pricesInfo.last_checked, currentLocale);
  const groups = groupPriceItems(visibleItems, currentLocale);

  return (
    <section className="rounded-2xl border border-green-100 bg-green-50/70 p-5 shadow-sm">
      <h2 className="text-lg font-extrabold text-green-950">
        {getArticleLabel(currentLocale, 'prices')}
      </h2>

      {summary && <p className="mt-2 text-sm leading-relaxed text-slate-700">{summary}</p>}

      {seasonNote && (
        <p className="mt-3 rounded-xl bg-white/75 p-3 text-sm leading-relaxed text-green-900">
          <span className="font-bold">{getArticleLabel(currentLocale, 'seasonNote')}:</span>{' '}
          {seasonNote}
        </p>
      )}

      <div className="mt-4 space-y-5">
        {groups.map((group) => (
          <section key={group.key} className="min-w-0">
            {group.label && (
              <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-green-900">
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
        <div className="mt-4 space-y-1 border-t border-green-100 pt-4 text-sm leading-relaxed text-slate-600">
          {notes && (
            <p>
              <span className="font-semibold text-slate-800">
                {getArticleLabel(currentLocale, 'note')}:
              </span>{' '}
              {notes}
            </p>
          )}
          {lastChecked && (
            <p>
              <span className="font-semibold text-slate-800">
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
