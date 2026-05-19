import type { PriceItem, SupportedLocale } from './articleTypes';
import { getLocalizedValue, normalizeLocale } from './articleLocalization';
import { getArticleLabel } from './articleLabels';

export type FormattedPriceItem = {
  label: string | null;
  text: string | null;
  note: string | null;
  value: string | null;
  official: boolean | null;
  officialBadge: string | null;
};

const intlLocaleByCode: Record<SupportedLocale, string> = {
  cs: 'cs-CZ',
  en: 'en-GB',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
};

const freeLabels: Record<SupportedLocale, string> = {
  cs: 'Zdarma',
  en: 'Free',
  de: 'Kostenlos',
  fr: 'Gratuit',
  es: 'Gratis',
};

const fromLabels: Record<SupportedLocale, string> = {
  cs: 'od',
  en: 'from',
  de: 'ab',
  fr: 'à partir de',
  es: 'desde',
};

const approxLabels: Record<SupportedLocale, string> = {
  cs: 'cca',
  en: 'approx.',
  de: 'ca.',
  fr: 'env.',
  es: 'aprox.',
};

const seasonalLabels: Record<SupportedLocale, string> = {
  cs: 'sezónní cena',
  en: 'seasonal price',
  de: 'Saisonpreis',
  fr: 'tarif saisonnier',
  es: 'precio de temporada',
};

const hourUnits: Record<SupportedLocale, string> = {
  cs: 'hodin',
  en: 'hours',
  de: 'Std.',
  fr: 'h',
  es: 'h',
};

const unitSuffixes: Record<SupportedLocale, Record<string, string>> = {
  cs: {
    person: '/ osoba',
    car: '/ auto',
    car_day: '/ auto / den',
    motorcycle_day: '/ motorka / den',
    day: '/ den',
    hour: '/ hod.',
    night: '/ noc',
    season: '/ sezona',
    '10_minutes': '/ 10 min',
    family: '/ rodina',
  },
  en: {
    person: '/ person',
    car: '/ car',
    car_day: '/ car / day',
    motorcycle_day: '/ motorcycle / day',
    day: '/ day',
    hour: '/ hour',
    night: '/ night',
    season: '/ season',
    '10_minutes': '/ 10 min',
    family: '/ family',
  },
  de: {
    person: '/ Person',
    car: '/ Auto',
    car_day: '/ Auto / Tag',
    motorcycle_day: '/ Motorrad / Tag',
    day: '/ Tag',
    hour: '/ Std.',
    night: '/ Nacht',
    season: '/ Saison',
    '10_minutes': '/ 10 Min.',
    family: '/ Familie',
  },
  fr: {
    person: '/ personne',
    car: '/ voiture',
    car_day: '/ voiture / jour',
    motorcycle_day: '/ moto / jour',
    day: '/ jour',
    hour: '/ h',
    night: '/ nuit',
    season: '/ saison',
    '10_minutes': '/ 10 min',
    family: '/ famille',
  },
  es: {
    person: '/ persona',
    car: '/ coche',
    car_day: '/ coche / día',
    motorcycle_day: '/ moto / día',
    day: '/ día',
    hour: '/ h',
    night: '/ noche',
    season: '/ temporada',
    '10_minutes': '/ 10 min',
    family: '/ familia',
  },
};

const currencySymbols: Record<string, string> = {
  CZK: 'Kč',
  EUR: '€',
  USD: '$',
  GBP: '£',
  PLN: 'zł',
};

export function getIntlLocale(locale: string): string {
  return intlLocaleByCode[normalizeLocale(locale)];
}

export function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function formatDate(dateString: string | null | undefined, locale: string): string | null {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDurationRange(
  minInput: number | string | null | undefined,
  maxInput: number | string | null | undefined,
  locale: string
): string | null {
  const min = toNumber(minInput);
  const max = toNumber(maxInput);

  if (min === null && max === null) {
    return null;
  }

  const currentLocale = normalizeLocale(locale);
  const formatter = new Intl.NumberFormat(getIntlLocale(currentLocale), {
    maximumFractionDigits: 1,
  });

  if (min !== null && max !== null && max < 60) {
    return min === max ? `${formatter.format(min)} min` : `${formatter.format(min)}–${formatter.format(max)} min`;
  }

  const formatHours = (minutes: number) => formatter.format(minutes / 60);

  if (min !== null && max !== null) {
    return min === max
      ? `${formatHours(min)} ${hourUnits[currentLocale]}`
      : `${formatHours(min)}–${formatHours(max)} ${hourUnits[currentLocale]}`;
  }

  const value = min ?? max;
  return value === null ? null : `${formatHours(value)} ${hourUnits[currentLocale]}`;
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 2,
  }).format(value);
}

function currencySymbol(currency: string): string {
  const normalized = currency.toUpperCase();
  return currencySymbols[normalized] ?? normalized;
}

function formatMoney(value: number, currency: string, locale: string): string {
  return `${formatNumber(value, locale)} ${currencySymbol(currency)}`;
}

function formatMoneyRange(
  min: number,
  max: number,
  currency: string,
  locale: string
): string {
  return `${formatNumber(min, locale)}–${formatNumber(max, locale)} ${currencySymbol(currency)}`;
}

function unitSuffix(unit: string | null | undefined, locale: string): string {
  if (!unit) {
    return '';
  }

  const currentLocale = normalizeLocale(locale);
  const suffix = unitSuffixes[currentLocale][unit] ?? unitSuffixes.cs[unit];

  return suffix ? ` ${suffix}` : '';
}

export function formatPriceValue(
  item: PriceItem,
  locale: string,
  fallbackCurrency?: string | null
): string | null {
  const currentLocale = normalizeLocale(locale);
  const priceType = item.price_type ?? 'text';
  const currency = item.currency ?? fallbackCurrency ?? 'EUR';
  const amount = toNumber(item.amount);
  const amountMin = toNumber(item.amount_min);
  const amountMax = toNumber(item.amount_max);
  const suffix = unitSuffix(item.unit, currentLocale);

  if (priceType === 'text') {
    return null;
  }

  if (priceType === 'free') {
    return freeLabels[currentLocale];
  }

  if (priceType === 'fixed' && amount !== null) {
    return `${formatMoney(amount, currency, currentLocale)}${suffix}`;
  }

  if (priceType === 'from' && amount !== null) {
    return `${fromLabels[currentLocale]} ${formatMoney(amount, currency, currentLocale)}${suffix}`;
  }

  if ((priceType === 'range' || priceType === 'approx' || priceType === 'seasonal') && amountMin !== null && amountMax !== null) {
    const range = `${formatMoneyRange(amountMin, amountMax, currency, currentLocale)}${suffix}`;
    return priceType === 'approx'
      ? `${approxLabels[currentLocale]} ${range}`
      : range;
  }

  if ((priceType === 'approx' || priceType === 'seasonal') && amount !== null) {
    const formatted = `${formatMoney(amount, currency, currentLocale)}${suffix}`;
    return priceType === 'approx'
      ? `${approxLabels[currentLocale]} ${formatted}`
      : formatted;
  }

  if (priceType === 'seasonal') {
    return seasonalLabels[currentLocale];
  }

  return null;
}

export function formatPriceItem(
  item: PriceItem,
  locale: string,
  fallbackCurrency?: string | null
): FormattedPriceItem | null {
  const currentLocale = normalizeLocale(locale);
  const value = formatPriceValue(item, currentLocale, fallbackCurrency);
  const label = getLocalizedValue(item.label, currentLocale);
  const text = getLocalizedValue(item.text, currentLocale);
  const note = getLocalizedValue(item.note, currentLocale);
  const official = typeof item.official === 'boolean' ? item.official : null;
  const officialBadge =
    official === null
      ? null
      : getArticleLabel(currentLocale, official ? 'official' : 'indicative');

  if (!label && !text && !note && !value) {
    return null;
  }

  return {
    label,
    text,
    note,
    value,
    official,
    officialBadge,
  };
}

export function sortBySortOrder<T extends { sort_order?: number | string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = toNumber(a.sort_order) ?? 0;
    const right = toNumber(b.sort_order) ?? 0;
    return left - right;
  });
}

export function stripLeadingListMarkers(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s+/, '').trim())
    .filter(Boolean)
    .join('\n');
}

export function normalizeStringArray(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return [value];
  }

  return [];
}
