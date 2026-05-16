import {
  crowdLevelLabels,
  getArticleLabel,
  getBooleanLabel,
  getCategoryLabel,
  getDurationLabel,
  getMappedLabel,
  getModeLabel,
  placeTypeLabels,
  swimmingTypeLabels,
  timeKeyLabels,
} from './articleLabels';
import {
  formatDurationRange,
  formatPriceItem,
  normalizeStringArray,
  stripLeadingListMarkers,
  toNumber,
} from './articleFormatting';
import {
  getLocalizedArticle,
  getLocalizedPracticalInfo,
  getLocalizedValue,
  normalizeLocale,
} from './articleLocalization';
import type {
  Article,
  LocalizedField,
  SupportedLocale,
  TrailHighlight,
  VisitInfo,
} from './articleTypes';

export {
  formatPriceItem,
  getBooleanLabel,
  getCategoryLabel,
  getLocalizedArticle,
  getLocalizedValue,
  getModeLabel,
};

type LabelMap = Record<SupportedLocale, Record<string, string>>;

export type VisitInfoCard = {
  label: string;
  value: string;
  note?: string;
  icon?: string;
  priority: number;
};

export type TrailHighlightGroup = {
  label: string;
  items: string[];
};

export type SafetyNote = {
  label: string;
  text: string;
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

const quickInfoLabels: LabelMap = {
  cs: {
    trails: 'Trasy',
    markedMtbRoutes: 'Značené MTB trasy',
    difficulty: 'Obtížnost',
    lift: 'Lanovka',
    liftName: 'Název lanovky',
    bikeRental: 'Půjčovna kol',
    scooterRental: 'Koloběžky',
    bikeSchool: 'Bike school',
    service: 'Servis',
    bikeWash: 'Myčka kol',
    showers: 'Sprchy',
    freeParking: 'Parkování zdarma',
    familyFriendly: 'Vhodné pro rodiny',
    beginnerFriendly: 'Vhodné pro začátečníky',
    helmetRequired: 'Helma povinná',
    fullFaceRequiredOnHardTrails: 'Integrální helma na těžké traily',
    protectiveGearRequiredOnHardTrails: 'Chrániče na těžké traily',
    rentalBooking: 'Půjčovnu rezervovat předem',
    safety: 'Bezpečnost',
    trailHighlights: 'Hlavní traily',
    dogs: 'Psi',
    waterNearby: 'U vody',
    beachNearby: 'Pláž poblíž',
    electricHookup: 'Elektřina',
    kitchen: 'Kuchyňka',
    washingMachine: 'Pračka',
    babyRoom: 'Baby room',
    shop: 'Obchod',
    restaurant: 'Restaurace',
    campfire: 'Ohniště',
  },
  en: {
    trails: 'Trails',
    markedMtbRoutes: 'Marked MTB routes',
    difficulty: 'Difficulty',
    lift: 'Lift',
    liftName: 'Lift name',
    bikeRental: 'Bike rental',
    scooterRental: 'Scooters',
    bikeSchool: 'Bike school',
    service: 'Service',
    bikeWash: 'Bike wash',
    showers: 'Showers',
    freeParking: 'Free parking',
    familyFriendly: 'Family friendly',
    beginnerFriendly: 'Beginner friendly',
    helmetRequired: 'Helmet required',
    fullFaceRequiredOnHardTrails: 'Full-face helmet on hard trails',
    protectiveGearRequiredOnHardTrails: 'Protective gear on hard trails',
    rentalBooking: 'Book rental in advance',
    safety: 'Safety',
    trailHighlights: 'Main trails',
    dogs: 'Dogs',
    waterNearby: 'By the water',
    beachNearby: 'Beach nearby',
    electricHookup: 'Electric hookup',
    kitchen: 'Kitchen',
    washingMachine: 'Washing machine',
    babyRoom: 'Baby room',
    shop: 'Shop',
    restaurant: 'Restaurant',
    campfire: 'Campfire places',
  },
  de: {
    trails: 'Trails',
    markedMtbRoutes: 'Markierte MTB-Routen',
    difficulty: 'Schwierigkeit',
    lift: 'Lift',
    liftName: 'Liftname',
    bikeRental: 'Bike-Verleih',
    scooterRental: 'Tretroller',
    bikeSchool: 'Bike school',
    service: 'Service',
    bikeWash: 'Bike-Wash',
    showers: 'Duschen',
    freeParking: 'Kostenloses Parken',
    familyFriendly: 'Familienfreundlich',
    beginnerFriendly: 'Für Anfänger geeignet',
    helmetRequired: 'Helmpflicht',
    fullFaceRequiredOnHardTrails: 'Fullface-Helm auf schweren Trails',
    protectiveGearRequiredOnHardTrails: 'Protektoren auf schweren Trails',
    rentalBooking: 'Verleih vorab reservieren',
    safety: 'Sicherheit',
    trailHighlights: 'Wichtigste Trails',
    dogs: 'Hunde',
    waterNearby: 'Am Wasser',
    beachNearby: 'Strand in der Nähe',
    electricHookup: 'Strom',
    kitchen: 'Küche',
    washingMachine: 'Waschmaschine',
    babyRoom: 'Babyraum',
    shop: 'Shop',
    restaurant: 'Restaurant',
    campfire: 'Feuerstellen',
  },
  fr: {
    trails: 'Trails',
    markedMtbRoutes: 'Itinéraires VTT balisés',
    difficulty: 'Difficulté',
    lift: 'Remontée',
    liftName: 'Nom de la remontée',
    bikeRental: 'Location de vélos',
    scooterRental: 'Trottinettes',
    bikeSchool: 'Bike school',
    service: 'Service',
    bikeWash: 'Lavage vélo',
    showers: 'Douches',
    freeParking: 'Parking gratuit',
    familyFriendly: 'Adapté aux familles',
    beginnerFriendly: 'Adapté aux débutants',
    helmetRequired: 'Casque obligatoire',
    fullFaceRequiredOnHardTrails: 'Casque intégral sur les trails difficiles',
    protectiveGearRequiredOnHardTrails: 'Protections sur les trails difficiles',
    rentalBooking: 'Réserver la location à l’avance',
    safety: 'Sécurité',
    trailHighlights: 'Trails principaux',
    dogs: 'Chiens',
    waterNearby: 'Au bord de l’eau',
    beachNearby: 'Plage à proximité',
    electricHookup: 'Électricité',
    kitchen: 'Cuisine',
    washingMachine: 'Lave-linge',
    babyRoom: 'Espace bébé',
    shop: 'Boutique',
    restaurant: 'Restaurant',
    campfire: 'Emplacements feu',
  },
  es: {
    trails: 'Trails',
    markedMtbRoutes: 'Rutas MTB señalizadas',
    difficulty: 'Dificultad',
    lift: 'Remonte',
    liftName: 'Nombre del remonte',
    bikeRental: 'Alquiler de bicis',
    scooterRental: 'Patinetes',
    bikeSchool: 'Bike school',
    service: 'Servicio',
    bikeWash: 'Lavado de bicis',
    showers: 'Duchas',
    freeParking: 'Aparcamiento gratis',
    familyFriendly: 'Apto para familias',
    beginnerFriendly: 'Apto para principiantes',
    helmetRequired: 'Casco obligatorio',
    fullFaceRequiredOnHardTrails: 'Casco integral en trails difíciles',
    protectiveGearRequiredOnHardTrails: 'Protecciones en trails difíciles',
    rentalBooking: 'Reservar el alquiler con antelación',
    safety: 'Seguridad',
    trailHighlights: 'Trails principales',
    dogs: 'Perros',
    waterNearby: 'Junto al agua',
    beachNearby: 'Playa cerca',
    electricHookup: 'Electricidad',
    kitchen: 'Cocina',
    washingMachine: 'Lavadora',
    babyRoom: 'Sala para bebés',
    shop: 'Tienda',
    restaurant: 'Restaurante',
    campfire: 'Zonas de fogata',
  },
};

const difficultyLabels: LabelMap = {
  cs: {
    easy: 'lehká',
    medium: 'střední',
    hard: 'těžká',
    expert: 'expert',
  },
  en: {
    easy: 'easy',
    medium: 'medium',
    hard: 'hard',
    expert: 'expert',
  },
  de: {
    easy: 'leicht',
    medium: 'mittel',
    hard: 'schwer',
    expert: 'Expert',
  },
  fr: {
    easy: 'facile',
    medium: 'intermédiaire',
    hard: 'difficile',
    expert: 'expert',
  },
  es: {
    easy: 'fácil',
    medium: 'media',
    hard: 'difícil',
    expert: 'experta',
  },
};

const trailNameLabels: Record<string, string> = {
  azur: 'Azur',
  rubin: 'Rubin',
  baron: 'Baron',
};

const difficultyOrder: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  expert: 4,
};

function label(locale: SupportedLocale, key: string): string {
  return quickInfoLabels[locale][key] ?? quickInfoLabels.cs[key] ?? key;
}

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

function getCurrentOrCsValue(field: LocalizedField, locale: SupportedLocale): string | null {
  if (!field) {
    return null;
  }

  if (typeof field === 'string') {
    return cleanText(field);
  }

  return cleanText(field[locale]) ?? cleanText(field.cs);
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

      const entryLabel = entryLabels[key] ?? openingHourEntryLabels.cs[key];

      if (!entryLabel) {
        return null;
      }

      const text = isRecord(entry) ? getLocalizedTextStrict(entry, locale) : null;

      return text ? `${entryLabel}: ${text}` : null;
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

function booleanCard(
  locale: SupportedLocale,
  labelKey: string,
  value: boolean | null | undefined,
  priority: number,
  note?: string | null
): VisitInfoCard | null {
  return quickCard(
    label(locale, labelKey),
    getBooleanLabel(value, locale),
    priority,
    note
  );
}

function mapKeyList(values: string[] | string | null | undefined, locale: string): string | null {
  const mapped = normalizeStringArray(values)
    .map((value) => getMappedLabel(timeKeyLabels, locale, value))
    .filter((value): value is string => Boolean(value));

  return mapped.length > 0 ? mapped.join(', ') : null;
}

function humanizeKey(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (first) => first.toUpperCase());
}

function formatKm(value: number | string | null | undefined, locale: SupportedLocale): string | null {
  const number = toNumber(value);

  if (number === null) {
    return null;
  }

  return `${new Intl.NumberFormat(locale === 'cs' ? 'cs-CZ' : locale, {
    maximumFractionDigits: 1,
  }).format(number)} km`;
}

function formatTrailNetwork(value: number | string | null | undefined, locale: SupportedLocale): string | null {
  const kilometers = formatKm(value, locale);

  if (!kilometers) {
    return null;
  }

  if (locale === 'cs') {
    return `${kilometers} trailů`;
  }

  if (locale === 'en') {
    return `${kilometers} of trails`;
  }

  if (locale === 'fr' || locale === 'es') {
    return `${kilometers} de trails`;
  }

  return `${kilometers} Trails`;
}

function normalizeDifficultyValues(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim().toLowerCase()).filter(Boolean);
  }

  const text = cleanText(value);

  if (!text) {
    return [];
  }

  if (text.includes('_to_')) {
    return text.split('_to_').map((item) => item.trim().toLowerCase()).filter(Boolean);
  }

  return text
    .split(/\s*(?:,|;|\||\/|\+|-|\u2013|\bto\b|\baž\b)\s*/i)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function formatDifficulty(value: string[] | string | null | undefined, locale: SupportedLocale): string | null {
  const values = normalizeDifficultyValues(value);

  if (values.length === 0) {
    return null;
  }

  const uniqueValues = [...new Set(values)].sort((a, b) => {
    const left = difficultyOrder[a] ?? Number.MAX_SAFE_INTEGER;
    const right = difficultyOrder[b] ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });

  const mapped = uniqueValues.map((item) => getMappedLabel(difficultyLabels, locale, item) ?? humanizeKey(item));

  if (mapped.length === 1) {
    return mapped[0];
  }

  const first = mapped[0];
  const last = mapped[mapped.length - 1];
  const connector = locale === 'cs' ? 'až' : 'to';

  return `${first} ${connector} ${last}`;
}

function trailName(id: string | null | undefined): string | null {
  const value = cleanText(id);

  if (!value) {
    return null;
  }

  return trailNameLabels[value.toLowerCase()] ?? humanizeKey(value);
}

function formatTrailHighlight(
  trail: TrailHighlight,
  locale: SupportedLocale
): string | null {
  const name = trailName(trail.id);
  const length = formatKm(trail.length_km, locale);
  const difficulty = getMappedLabel(difficultyLabels, locale, trail.difficulty) ??
    (trail.difficulty ? humanizeKey(trail.difficulty) : null);
  const parts = [name, length, difficulty].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(' — ') : null;
}

export function getVisitSafetyNote(
  article: Pick<Article, 'visit_info'>,
  locale: string
): SafetyNote | null {
  const visitInfo = article.visit_info;
  const currentLocale = normalizeLocale(locale);

  if (visitInfo?.place_type !== 'bike_trail') {
    return null;
  }

  const text = getCurrentOrCsValue(visitInfo.safety_note, currentLocale);

  return text
    ? {
        label: label(currentLocale, 'safety'),
        text,
      }
    : null;
}

export function getTrailHighlightGroup(
  article: Pick<Article, 'visit_info'>,
  locale: string
): TrailHighlightGroup | null {
  const visitInfo = article.visit_info;
  const currentLocale = normalizeLocale(locale);

  if (visitInfo?.place_type !== 'bike_trail' || !Array.isArray(visitInfo.trail_highlights)) {
    return null;
  }

  const items = visitInfo.trail_highlights
    .map((trail) => formatTrailHighlight(trail, currentLocale))
    .filter((item): item is string => Boolean(item));

  return items.length > 0
    ? {
        label: label(currentLocale, 'trailHighlights'),
        items,
      }
    : null;
}

export function getVisitInfoCards(
  article: Pick<Article, 'visit_info' | 'practical_info'>,
  locale: string
): VisitInfoCard[] {
  const visitInfo = article.visit_info;

  if (!visitInfo) {
    return [];
  }

  const currentLocale = normalizeLocale(locale);
  const placeType = visitInfo.place_type ?? null;
  const isBikeTrail = placeType === 'bike_trail';
  const isCamping = placeType === 'camping';
  const duration = formatDurationRange(
    visitInfo.recommended_time_minutes_min,
    visitInfo.recommended_time_minutes_max,
    currentLocale
  );
  const localizedPracticalInfo = getLocalizedPracticalInfo(article.practical_info, currentLocale);
  const rentalBooking = isBikeTrail && localizedPracticalInfo?.booking
    ? stripLeadingListMarkers(localizedPracticalInfo.booking)
    : null;
  const showBookingRecommended =
    visitInfo.booking_recommended === true ||
    (!isBikeTrail && typeof visitInfo.booking_recommended === 'boolean');
  const showOnlineOnly =
    visitInfo.tickets_online_only === true ||
    (!isBikeTrail && !isCamping && typeof visitInfo.tickets_online_only === 'boolean');

  const commonCards = [
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
      getArticleLabel(currentLocale, 'officialHours'),
      getOpeningHoursText(visitInfo, currentLocale),
      40
    ),
    showBookingRecommended
      ? quickCard(
          getArticleLabel(currentLocale, 'bookingRecommended'),
          getBooleanLabel(visitInfo.booking_recommended, currentLocale),
          50
        )
      : null,
    showOnlineOnly
      ? quickCard(
          getArticleLabel(currentLocale, 'onlineOnly'),
          getBooleanLabel(visitInfo.tickets_online_only, currentLocale),
          60
        )
      : null,
    quickCard(
      label(currentLocale, 'rentalBooking'),
      rentalBooking,
      70
    ),
    quickCard(
      getArticleLabel(currentLocale, 'nudistBeach'),
      getBooleanLabel(visitInfo.nudist_beach, currentLocale),
      80,
      getLocalizedValue(visitInfo.nudist_beach_note, currentLocale)
    ),
    quickCard(
      getArticleLabel(currentLocale, 'waterQuality'),
      getLocalizedValue(visitInfo.water_quality_note, currentLocale),
      90
    ),
    quickCard(
      getArticleLabel(currentLocale, 'bestTime'),
      mapKeyList(visitInfo.best_time_keys, currentLocale),
      100
    ),
    quickCard(
      getArticleLabel(currentLocale, 'avoidIfPossible'),
      mapKeyList(visitInfo.avoid_if_possible_keys, currentLocale),
      110
    ),
    quickCard(
      getArticleLabel(currentLocale, 'swimmingType'),
      getMappedLabel(swimmingTypeLabels, currentLocale, visitInfo.swimming_type),
      120
    ),
  ];

  const campingCards = isCamping
    ? [
        booleanCard(currentLocale, 'familyFriendly', visitInfo.family_friendly, 200),
        booleanCard(
          currentLocale,
          'dogs',
          visitInfo.dogs_allowed,
          210,
          getLocalizedValue(visitInfo.dogs_allowed_note, currentLocale)
        ),
        booleanCard(currentLocale, 'waterNearby', visitInfo.water_nearby, 220),
        booleanCard(currentLocale, 'beachNearby', visitInfo.beach_nearby, 230),
        booleanCard(currentLocale, 'electricHookup', visitInfo.electric_hookup, 240),
        booleanCard(currentLocale, 'kitchen', visitInfo.kitchen_available, 250),
        booleanCard(currentLocale, 'showers', visitInfo.showers_available, 260),
        booleanCard(currentLocale, 'washingMachine', visitInfo.washing_machine_available, 270),
        booleanCard(currentLocale, 'babyRoom', visitInfo.baby_room_available, 280),
        booleanCard(currentLocale, 'shop', visitInfo.shop_available, 290),
        booleanCard(currentLocale, 'restaurant', visitInfo.restaurant_available, 300),
        booleanCard(currentLocale, 'campfire', visitInfo.campfire_places, 310),
      ]
    : [];

  const bikeTrailCards = isBikeTrail
    ? [
        quickCard(
          label(currentLocale, 'trails'),
          formatTrailNetwork(visitInfo.trail_network_km, currentLocale),
          200
        ),
        quickCard(
          label(currentLocale, 'markedMtbRoutes'),
          formatKm(visitInfo.marked_mtb_routes_km, currentLocale),
          210
        ),
        quickCard(
          label(currentLocale, 'difficulty'),
          formatDifficulty(visitInfo.difficulty, currentLocale),
          220
        ),
        booleanCard(currentLocale, 'lift', visitInfo.lift_available, 230),
        quickCard(label(currentLocale, 'liftName'), visitInfo.lift_name, 240),
        booleanCard(currentLocale, 'bikeRental', visitInfo.bike_rental_available, 250),
        booleanCard(currentLocale, 'scooterRental', visitInfo.scooter_rental_available, 260),
        booleanCard(currentLocale, 'bikeSchool', visitInfo.bike_school_available, 270),
        booleanCard(currentLocale, 'service', visitInfo.service_available, 280),
        booleanCard(currentLocale, 'bikeWash', visitInfo.bike_wash_available, 290),
        booleanCard(currentLocale, 'showers', visitInfo.showers_available, 300),
        booleanCard(currentLocale, 'freeParking', visitInfo.free_parking, 310),
        booleanCard(currentLocale, 'familyFriendly', visitInfo.family_friendly, 320),
        booleanCard(currentLocale, 'beginnerFriendly', visitInfo.beginner_friendly, 330),
        booleanCard(currentLocale, 'helmetRequired', visitInfo.helmet_required, 340),
        booleanCard(currentLocale, 'fullFaceRequiredOnHardTrails', visitInfo.full_face_required_on_hard_trails, 350),
        booleanCard(currentLocale, 'protectiveGearRequiredOnHardTrails', visitInfo.protective_gear_required_on_hard_trails, 360),
      ]
    : [];

  return [...commonCards, ...campingCards, ...bikeTrailCards]
    .filter((card): card is VisitInfoCard => Boolean(card))
    .sort((left, right) => left.priority - right.priority);
}
