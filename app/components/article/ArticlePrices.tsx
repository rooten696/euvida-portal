import { getArticleLabel } from '@/lib/articleLabels';
import { formatDate, formatPriceItem, sortBySortOrder } from '@/lib/articleFormatting';
import { getLocalizedValue, normalizeLocale } from '@/lib/articleLocalization';
import type { PriceItem, PricesInfo, SupportedLocale } from '@/lib/articleTypes';

type ArticlePricesProps = {
  locale: string;
  pricesInfo?: PricesInfo | null;
};

type LabelMap = Record<SupportedLocale, Record<string, string>>;

type PriceGroup = {
  label: string | null;
  items: PriceItem[];
};

const priceCategoryLabels: LabelMap = {
  cs: {
    accommodation_person: 'Osoby',
    accommodation_unit: 'Ubytování a místa',
    vehicle: 'Vozidla',
    pet: 'Psi a domácí zvířata',
    tax: 'Poplatky',
    food_drink: 'Jídlo a pití',
    rental: 'Půjčovny',
    activity: 'Aktivity',
    parking: 'Parkování',
    ticket: 'Vstupné',
    lift_ticket: 'Lanovka a bike ticket',
    package: 'Balíčky',
    protective_gear: 'Chrániče a vybavení',
    service: 'Služby',
    adult: 'Dospělí',
    child: 'Děti',
    reduced: 'Zlevněné',
    family: 'Rodiny',
    locker: 'Skříňky',
  },
  en: {
    accommodation_person: 'People',
    accommodation_unit: 'Accommodation and pitches',
    vehicle: 'Vehicles',
    pet: 'Dogs and pets',
    tax: 'Fees',
    food_drink: 'Food and drink',
    rental: 'Rentals',
    activity: 'Activities',
    parking: 'Parking',
    ticket: 'Admission',
    lift_ticket: 'Lift and bike ticket',
    package: 'Packages',
    protective_gear: 'Protective gear and equipment',
    service: 'Services',
    adult: 'Adults',
    child: 'Children',
    reduced: 'Reduced',
    family: 'Families',
    locker: 'Lockers',
  },
  de: {
    accommodation_person: 'Personen',
    accommodation_unit: 'Unterkunft und Stellplätze',
    vehicle: 'Fahrzeuge',
    pet: 'Hunde und Haustiere',
    tax: 'Gebühren',
    food_drink: 'Essen und Trinken',
    rental: 'Verleih',
    activity: 'Aktivitäten',
    parking: 'Parken',
    ticket: 'Eintritt',
    lift_ticket: 'Lift- und Bike-Ticket',
    package: 'Pakete',
    protective_gear: 'Protektoren und Ausrüstung',
    service: 'Services',
    adult: 'Erwachsene',
    child: 'Kinder',
    reduced: 'Ermäßigt',
    family: 'Familien',
    locker: 'Schließfächer',
  },
  fr: {
    accommodation_person: 'Personnes',
    accommodation_unit: 'Hébergement et emplacements',
    vehicle: 'Véhicules',
    pet: 'Chiens et animaux',
    tax: 'Frais',
    food_drink: 'Restauration',
    rental: 'Locations',
    activity: 'Activités',
    parking: 'Stationnement',
    ticket: 'Entrée',
    lift_ticket: 'Remontée et bike ticket',
    package: 'Forfaits',
    protective_gear: 'Protections et équipement',
    service: 'Services',
    adult: 'Adultes',
    child: 'Enfants',
    reduced: 'Tarif réduit',
    family: 'Familles',
    locker: 'Casiers',
  },
  es: {
    accommodation_person: 'Personas',
    accommodation_unit: 'Alojamiento y parcelas',
    vehicle: 'Vehículos',
    pet: 'Perros y mascotas',
    tax: 'Tasas',
    food_drink: 'Comida y bebida',
    rental: 'Alquileres',
    activity: 'Actividades',
    parking: 'Aparcamiento',
    ticket: 'Entrada',
    lift_ticket: 'Remonte y bike ticket',
    package: 'Paquetes',
    protective_gear: 'Protecciones y equipamiento',
    service: 'Servicios',
    adult: 'Adultos',
    child: 'Niños',
    reduced: 'Reducida',
    family: 'Familias',
    locker: 'Taquillas',
  },
};

const otherPriceLabels: Record<SupportedLocale, string> = {
  cs: 'Další ceny',
  en: 'Other prices',
  de: 'Weitere Preise',
  fr: 'Autres tarifs',
  es: 'Otros precios',
};

function priceCategoryLabel(category: string | null | undefined, locale: SupportedLocale): string | null {
  if (!category) {
    return null;
  }

  return priceCategoryLabels[locale][category] ?? priceCategoryLabels.cs[category] ?? otherPriceLabels[locale];
}

function groupPriceItems(items: PriceItem[], locale: SupportedLocale): PriceGroup[] {
  const hasCategories = items.some((item) => Boolean(item.category));

  if (!hasCategories) {
    return [{ label: null, items }];
  }

  const groups = new Map<string, PriceGroup>();

  for (const item of items) {
    const groupLabel = priceCategoryLabel(item.category, locale) ?? otherPriceLabels[locale];
    const group = groups.get(groupLabel) ?? { label: groupLabel, items: [] };
    group.items.push(item);
    groups.set(groupLabel, group);
  }

  return [...groups.values()];
}

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
            <h4 className="text-sm font-bold leading-snug text-slate-950">
              {label}
            </h4>
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
  const groupedItems = groupPriceItems(visibleItems, currentLocale);

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

      <div className="mt-4 space-y-4">
        {groupedItems.map((group, groupIndex) => (
          <div key={group.label ?? `prices-${groupIndex}`}>
            {group.label && (
              <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-green-800">
                {group.label}
              </h3>
            )}
            <ul className="space-y-3">
              {group.items.map((item, index) => (
                <PriceRow
                  key={item.id ?? `${item.price_type ?? 'price'}-${groupIndex}-${index}`}
                  item={item}
                  locale={currentLocale}
                  fallbackCurrency={pricesInfo.currency}
                  index={index}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

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
