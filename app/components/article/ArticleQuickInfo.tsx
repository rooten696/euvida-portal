import {
  crowdLevelLabels,
  getArticleLabel,
  getDurationLabel,
  getMappedLabel,
  swimmingTypeLabels,
  timeKeyLabels,
} from '@/lib/articleLabels';
import {
  formatDurationRange,
  normalizeStringArray,
  stripLeadingListMarkers,
  toNumber,
} from '@/lib/articleFormatting';
import {
  getLocalizedPracticalInfo,
  getLocalizedValue,
  normalizeLocale,
} from '@/lib/articleLocalization';
import type {
  LocalizedField,
  PracticalInfoLocales,
  SupportedLocale,
  TrailHighlight,
  VisitInfo,
} from '@/lib/articleTypes';

type ArticleQuickInfoProps = {
  locale: string;
  visitInfo?: VisitInfo | null;
  practicalInfo?: PracticalInfoLocales | null;
};

type QuickInfoRow = {
  label: string;
  value: string;
};

type LabelMap = Record<SupportedLocale, Record<string, string>>;

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

function getCurrentOrCsValue(field: LocalizedField, locale: SupportedLocale): string | null {
  if (!field) {
    return null;
  }

  if (typeof field === 'string') {
    return cleanText(field);
  }

  return cleanText(field[locale]) ?? cleanText(field.cs);
}

function booleanLabel(value: boolean, locale: string): string {
  return getArticleLabel(locale, value ? 'yes' : 'no');
}

function booleanRow(
  locale: SupportedLocale,
  labelKey: string,
  value: boolean | null | undefined
): QuickInfoRow | null {
  return typeof value === 'boolean'
    ? { label: label(locale, labelKey), value: booleanLabel(value, locale) }
    : null;
}

function booleanWithNote(
  value: boolean | null | undefined,
  note: LocalizedField,
  locale: SupportedLocale
): string | null {
  const localizedNote = getLocalizedValue(note, locale);

  if (typeof value === 'boolean') {
    return localizedNote
      ? `${booleanLabel(value, locale)} (${localizedNote})`
      : booleanLabel(value, locale);
  }

  return localizedNote;
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

  return text.split(/\s*(?:,|;|\||\/|\+|–|-|\bto\b)\s*/i).map((item) => item.trim().toLowerCase()).filter(Boolean);
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

  return parts.length > 0 ? parts.join(' - ') : null;
}

export default function ArticleQuickInfo({
  locale,
  visitInfo,
  practicalInfo,
}: ArticleQuickInfoProps) {
  if (!visitInfo) {
    return null;
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
  const openingHours =
    getLocalizedValue(visitInfo.opening_hours_text, currentLocale) ??
    getLocalizedValue(visitInfo.official_opening_hours, currentLocale);
  const localizedPracticalInfo = getLocalizedPracticalInfo(practicalInfo, currentLocale);
  const rentalBooking = isBikeTrail && localizedPracticalInfo?.booking
    ? stripLeadingListMarkers(localizedPracticalInfo.booking)
    : null;
  const trailHighlights = isBikeTrail && Array.isArray(visitInfo.trail_highlights)
    ? visitInfo.trail_highlights
        .map((trail) => formatTrailHighlight(trail, currentLocale))
        .filter((item): item is string => Boolean(item))
    : [];
  const safetyNote = isBikeTrail
    ? getCurrentOrCsValue(visitInfo.safety_note, currentLocale)
    : null;

  const commonRows = [
    duration
      ? {
          label: getDurationLabel(currentLocale, placeType),
          value: duration,
        }
      : null,
    {
      label: getArticleLabel(currentLocale, 'crowdLevel'),
      value: getMappedLabel(crowdLevelLabels, currentLocale, visitInfo.crowd_level) ?? '',
    },
    openingHours
      ? {
          label: getArticleLabel(currentLocale, 'officialHours'),
          value: openingHours,
        }
      : null,
    visitInfo.booking_recommended === true
      ? {
          label: getArticleLabel(currentLocale, 'bookingRecommended'),
          value: booleanLabel(true, currentLocale),
        }
      : null,
    visitInfo.tickets_online_only === true
      ? {
          label: getArticleLabel(currentLocale, 'onlineOnly'),
          value: booleanLabel(true, currentLocale),
        }
      : null,
    rentalBooking
      ? {
          label: label(currentLocale, 'rentalBooking'),
          value: rentalBooking,
        }
      : null,
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
      label: getArticleLabel(currentLocale, 'waterQuality'),
      value: getLocalizedValue(visitInfo.water_quality_note, currentLocale) ?? '',
    },
  ].filter((row): row is QuickInfoRow => Boolean(row && row.value.length > 0));

  const campingRows = isCamping
    ? [
        booleanRow(currentLocale, 'familyFriendly', visitInfo.family_friendly),
        {
          label: label(currentLocale, 'dogs'),
          value: booleanWithNote(visitInfo.dogs_allowed, visitInfo.dogs_allowed_note, currentLocale) ?? '',
        },
        booleanRow(currentLocale, 'waterNearby', visitInfo.water_nearby),
        booleanRow(currentLocale, 'beachNearby', visitInfo.beach_nearby),
        booleanRow(currentLocale, 'electricHookup', visitInfo.electric_hookup),
        booleanRow(currentLocale, 'kitchen', visitInfo.kitchen_available),
        booleanRow(currentLocale, 'showers', visitInfo.showers_available),
        booleanRow(currentLocale, 'washingMachine', visitInfo.washing_machine_available),
        booleanRow(currentLocale, 'babyRoom', visitInfo.baby_room_available),
        booleanRow(currentLocale, 'shop', visitInfo.shop_available),
        booleanRow(currentLocale, 'restaurant', visitInfo.restaurant_available),
        booleanRow(currentLocale, 'campfire', visitInfo.campfire_places),
      ].filter((row): row is QuickInfoRow => Boolean(row && row.value.length > 0))
    : [];

  const bikeTrailRows = isBikeTrail
    ? [
        {
          label: label(currentLocale, 'trails'),
          value: formatTrailNetwork(visitInfo.trail_network_km, currentLocale) ?? '',
        },
        {
          label: label(currentLocale, 'markedMtbRoutes'),
          value: formatKm(visitInfo.marked_mtb_routes_km, currentLocale) ?? '',
        },
        {
          label: label(currentLocale, 'difficulty'),
          value: formatDifficulty(visitInfo.difficulty, currentLocale) ?? '',
        },
        booleanRow(currentLocale, 'lift', visitInfo.lift_available),
        visitInfo.lift_name
          ? {
              label: label(currentLocale, 'liftName'),
              value: visitInfo.lift_name,
            }
          : null,
        booleanRow(currentLocale, 'bikeRental', visitInfo.bike_rental_available),
        booleanRow(currentLocale, 'scooterRental', visitInfo.scooter_rental_available),
        booleanRow(currentLocale, 'bikeSchool', visitInfo.bike_school_available),
        booleanRow(currentLocale, 'service', visitInfo.service_available),
        booleanRow(currentLocale, 'bikeWash', visitInfo.bike_wash_available),
        booleanRow(currentLocale, 'showers', visitInfo.showers_available),
        booleanRow(currentLocale, 'freeParking', visitInfo.free_parking),
        booleanRow(currentLocale, 'familyFriendly', visitInfo.family_friendly),
        booleanRow(currentLocale, 'beginnerFriendly', visitInfo.beginner_friendly),
        booleanRow(currentLocale, 'helmetRequired', visitInfo.helmet_required),
        booleanRow(currentLocale, 'fullFaceRequiredOnHardTrails', visitInfo.full_face_required_on_hard_trails),
        booleanRow(currentLocale, 'protectiveGearRequiredOnHardTrails', visitInfo.protective_gear_required_on_hard_trails),
      ].filter((row): row is QuickInfoRow => Boolean(row && row.value.length > 0))
    : [];

  const rows = [...commonRows, ...campingRows, ...bikeTrailRows];

  if (rows.length === 0 && trailHighlights.length === 0 && !safetyNote) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-extrabold text-blue-950">
        {getArticleLabel(currentLocale, 'quickInfo')}
      </h2>

      {safetyNote && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3">
          <h3 className="text-sm font-extrabold text-red-950">
            {label(currentLocale, 'safety')}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-red-900">
            {safetyNote}
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <dl className="space-y-3">
          {rows.map((row, index) => (
            <div key={`${row.label}-${index}`} className="rounded-xl bg-white/75 p-3">
              <dt className="text-xs font-bold uppercase tracking-wide text-blue-700">
                {row.label}
              </dt>
              <dd className="mt-1 text-sm font-semibold leading-relaxed text-slate-900">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {trailHighlights.length > 0 && (
        <div className="mt-4 border-t border-blue-100 pt-4">
          <h3 className="text-sm font-extrabold text-blue-950">
            {label(currentLocale, 'trailHighlights')}
          </h3>
          <ul className="mt-2 space-y-2">
            {trailHighlights.map((trail) => (
              <li key={trail} className="rounded-xl bg-white/75 p-3 text-sm font-semibold leading-relaxed text-slate-900">
                {trail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
