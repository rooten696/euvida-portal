import { getArticleLabel } from '@/lib/articleLabels';
import { formatDate, formatPriceItem, sortBySortOrder } from '@/lib/articleFormatting';
import { getLocalizedValue, normalizeLocale } from '@/lib/articleLocalization';
import type { PriceItem, PricesInfo } from '@/lib/articleTypes';

type ArticlePricesProps = {
  locale: string;
  pricesInfo?: PricesInfo | null;
};

function PriceRow({
  item,
  locale,
  fallbackCurrency,
  index,
}: {
  item: PriceItem;
  locale: string;
  fallbackCurrency?: string | null;
  index: number;
}) {
  const label = getLocalizedValue(item.label, locale);
  const text = getLocalizedValue(item.text, locale);
  const note = getLocalizedValue(item.note, locale);
  const price = formatPriceItem(item, locale, fallbackCurrency);

  if (!label && !text && !price) {
    return null;
  }

  return (
    <li className="border-b border-green-100 pb-3 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {label && (
            <h3 className="text-sm font-bold leading-snug text-slate-950">
              {label}
            </h3>
          )}
          {text && (
            <p className={`text-sm leading-relaxed text-slate-700 ${label ? 'mt-1' : ''}`}>
              {text}
            </p>
          )}
        </div>
        {price && (
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-sm font-extrabold text-green-900 shadow-sm">
            {price}
          </span>
        )}
      </div>
      {note && (
        <p className="mt-2 text-xs leading-relaxed text-green-800/85">
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
    Boolean(
      getLocalizedValue(item.label, currentLocale) ||
      getLocalizedValue(item.text, currentLocale) ||
      formatPriceItem(item, currentLocale, pricesInfo.currency)
    )
  );

  if (visibleItems.length === 0) {
    return null;
  }

  const summary = getLocalizedValue(pricesInfo.summary, currentLocale);
  const seasonNote = getLocalizedValue(pricesInfo.season_note, currentLocale);
  const notes = getLocalizedValue(pricesInfo.notes, currentLocale);
  const lastChecked = formatDate(pricesInfo.last_checked, currentLocale);

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

      <ul className="mt-4 space-y-3">
        {visibleItems.map((item, index) => (
          <PriceRow
            key={item.id ?? `${item.price_type ?? 'price'}-${index}`}
            item={item}
            locale={currentLocale}
            fallbackCurrency={pricesInfo.currency}
            index={index}
          />
        ))}
      </ul>

      {(notes || lastChecked) && (
        <div className="mt-4 space-y-1 border-t border-green-100 pt-4 text-xs leading-relaxed text-slate-600">
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
