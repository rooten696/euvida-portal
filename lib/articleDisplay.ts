import {
  crowdLevelLabels,
  getArticleLabel,
  getBooleanLabel,
  getCategoryLabel,
  getDurationLabel,
  getMappedLabel,
  getModeLabel,
  placeTypeLabels,
} from './articleLabels';
import { formatDurationRange, formatPriceItem } from './articleFormatting';
import {
  getLocalizedArticle,
  getLocalizedValue,
  normalizeLocale,
} from './articleLocalization';
import type { Article, LocalizedField, SupportedLocale, VisitInfo } from './articleTypes';

export {
  formatPriceItem,
  getBooleanLabel,
  getCategoryLabel,
  getLocalizedArticle,
  getLocalizedValue,
  getModeLabel,
};

export type VisitInfoCard = {
  label: string;
  value: string;
  note?: string;
  icon?: string;
  priority: number;
};

const technicalOpeningHourKeys = new Set([
  'note',
  'source_note',
  'general_access',
  'check_before_visit',
  'source',
]);

const openingHourEntryLabels: Record<SupportedLocale, Record<string, string>> = {
  cs: {
    monday: 'Pondělí',
    tuesday: 'Úterý',
    wednesday: 'Středa',
    thursday: 'Čtvrtek',
    friday: 'Pátek',
    saturday: 'Sobota',
    sunday: 'Neděle',
    weekdays: 'Všední dny',
    weekend: 'Víkend',
    daily: 'Denně',
  },
  en: {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    weekdays: 'Weekdays',
    weekend: 'Weekend',
    daily: 'Daily',
  },
  de: {
    monday: 'Montag',
    tuesday: 'Dienstag',
    wednesday: 'Mittwoch',
    thursday: 'Donnerstag',
    friday: 'Freitag',
    saturday: 'Samstag',
    sunday: 'Sonntag',
    weekdays: 'Werktage',
    weekend: 'Wochenende',
    daily: 'Täglich',
  },
  fr: {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche',
    weekdays: 'Jours de semaine',
    weekend: 'Week-end',
    daily: 'Tous les jours',
  },
  es: {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
    weekdays: 'Días laborables',
    weekend: 'Fin de semana',
    daily: 'Todos los días',
  },
};

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getLocalizedTextStrict(
  value: LocalizedField | unknown,
  locale: SupportedLocale
): string | null {
  if (typeof value === 'string') {
    return cleanText(value);
  }

  if (!isRecord(value)) {
    return null;
  }

  return cleanText(value[locale]) ?? cleanText(value.cs);
}

function hasOpeningHoursData(value: VisitInfo['official_opening_hours']): boolean {
  if (typeof value === 'string') {
    return cleanText(value) !== null;
  }

  return isRecord(value) && Object.keys(value).length > 0;
}

function getStructuredOpeningHoursText(
  value: VisitInfo['official_opening_hours'],
  locale: SupportedLocale
): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const localizedRoot = getLocalizedTextStrict(value, locale);

  if (localizedRoot) {
    return localizedRoot;
  }

  const nestedTextKeys = ['text', 'summary', 'hours', 'opening_hours', 'opening_hours_text'];

  for (const key of nestedTextKeys) {
    const candidate = value[key];
    const localizedText = isRecord(candidate)
      ? getLocalizedTextStrict(candidate, locale)
      : null;

    if (localizedText) {
      return localizedText;
    }
  }

  const entryLabels = openingHourEntryLabels[locale];
  const rows = Object.entries(value)
    .map(([key, entry]) => {
      if (technicalOpeningHourKeys.has(key)) {
        return null;
      }

      const label = entryLabels[key] ?? openingHourEntryLabels.cs[key];

      if (!label) {
        return null;
      }

      const text = isRecord(entry) ? getLocalizedTextStrict(entry, locale) : null;

      return text ? `${label}: ${text}` : null;
    })
    .filter((row): row is string => Boolean(row));

  return rows.length > 0 ? rows.join('; ') : null;
}

function getOpeningHoursText(
  visitInfo: VisitInfo,
  locale: SupportedLocale
): string | null {
  const explicitText = getLocalizedTextStrict(visitInfo.opening_hours_text, locale);

  if (explicitText) {
    return explicitText;
  }

  const structuredText = getStructuredOpeningHoursText(
    visitInfo.official_opening_hours,
    locale
  );

  if (structuredText) {
    return structuredText;
  }

  return hasOpeningHoursData(visitInfo.official_opening_hours)
    ? getArticleLabel(locale, 'openingHoursFallback')
    : null;
}

function quickCard(
  label: string,
  value: string | null | undefined,
  priority: number,
  note?: string | null
): VisitInfoCard | null {
  if (!value) {
    return null;
  }

  return {
    label,
    value,
    note: note ?? undefined,
    priority,
  };
}

export function getVisitInfoCards(
  article: Pick<Article, 'visit_info'>,
  locale: string
): VisitInfoCard[] {
  const visitInfo = article.visit_info;

  if (!visitInfo) {
    return [];
  }

  const currentLocale = normalizeLocale(locale);
  const duration = formatDurationRange(
    visitInfo.recommended_time_minutes_min,
    visitInfo.recommended_time_minutes_max,
    currentLocale
  );

  return [
    quickCard(
      getArticleLabel(currentLocale, 'placeType'),
      getMappedLabel(placeTypeLabels, currentLocale, visitInfo.place_type),
      10
    ),
    quickCard(
      getDurationLabel(currentLocale, visitInfo.place_type),
      duration,
      20
    ),
    quickCard(
      getArticleLabel(currentLocale, 'crowdLevel'),
      getMappedLabel(crowdLevelLabels, currentLocale, visitInfo.crowd_level),
      30
    ),
    quickCard(
      getArticleLabel(currentLocale, 'bookingRecommended'),
      getBooleanLabel(visitInfo.booking_recommended, currentLocale),
      40
    ),
    quickCard(
      getArticleLabel(currentLocale, 'onlineOnly'),
      getBooleanLabel(visitInfo.tickets_online_only, currentLocale),
      50
    ),
    quickCard(
      getArticleLabel(currentLocale, 'nudistBeach'),
      getBooleanLabel(visitInfo.nudist_beach, currentLocale),
      60,
      getLocalizedValue(visitInfo.nudist_beach_note, currentLocale)
    ),
    quickCard(
      getArticleLabel(currentLocale, 'officialHours'),
      getOpeningHoursText(visitInfo, currentLocale),
      70
    ),
    quickCard(
      getArticleLabel(currentLocale, 'waterQuality'),
      getLocalizedValue(visitInfo.water_quality_note, currentLocale),
      80
    ),
  ]
    .filter((card): card is VisitInfoCard => Boolean(card))
    .sort((left, right) => left.priority - right.priority);
}
