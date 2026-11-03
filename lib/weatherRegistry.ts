export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type LocalizedNames = Record<string, string>;

export type VerifiedWeatherLocation = {
  regionId: string;
  pointName: LocalizedNames;
  countryCode: string; // ISO-2 (e.g. 'CZ', 'GR', 'HR', 'PT', 'FR')
  countryId: string; // ISO-3 (e.g. 'CZE', 'GRC', 'HRV', 'PRT', 'FRA')
  latitude: number;
  longitude: number;
  verifiedDate: string;
};

export type GeocodingLocationResult = {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  country_code: string;
  country?: string;
  population?: number;
};

export const ISO3_TO_ISO2: Record<string, string> = {
  AND: 'AD',
  AUT: 'AT',
  BEL: 'BE',
  BGR: 'BG',
  CHE: 'CH',
  CYP: 'CY',
  CZE: 'CZ',
  DEU: 'DE',
  DNK: 'DK',
  ESP: 'ES',
  EST: 'EE',
  FIN: 'FI',
  FRA: 'FR',
  GBR: 'GB',
  GRC: 'GR',
  HRV: 'HR',
  HUN: 'HU',
  IRL: 'IE',
  ISL: 'IS',
  ITA: 'IT',
  LIE: 'LI',
  LTU: 'LT',
  LUX: 'LU',
  LVA: 'LV',
  MLT: 'MT',
  NLD: 'NL',
  NOR: 'NO',
  POL: 'PL',
  PRT: 'PT',
  ROU: 'RO',
  SRB: 'RS',
  SVK: 'SK',
  SVN: 'SI',
  SWE: 'SE',
  TUR: 'TR',
  UKR: 'UA',
};

const VALID_ISO2_CODES = new Set(Object.values(ISO3_TO_ISO2));

export function toIso2CountryCode(countryCode: string | null | undefined): string | null {
  if (!countryCode || typeof countryCode !== 'string') {
    return null;
  }

  const trimmed = countryCode.trim().toUpperCase();
  if (trimmed.length === 2 && VALID_ISO2_CODES.has(trimmed)) {
    return trimmed;
  }

  if (trimmed.length === 3 && ISO3_TO_ISO2[trimmed]) {
    return ISO3_TO_ISO2[trimmed];
  }

  return null;
}

function toCoordinateNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeCoordinates(latitude: unknown, longitude: unknown): Coordinates | null {
  const lat = toCoordinateNumber(latitude);
  const lng = toCoordinateNumber(longitude);

  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { latitude: lat, longitude: lng };
}

export function parseWeatherCoordinates(value: unknown): Coordinates | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Matches standard decimal format with optional degrees or hemisphere letter (e.g. "33.9° S, 18.4° W" or "50.08804, 14.42076")
    const matches = /^\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*[,;]\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([EW])?\s*$/i.exec(trimmed);
    if (!matches) {
      return null;
    }

    // Signed values combined with hemisphere notation are ambiguous.
    if ((matches[2] && /^[+-]/.test(matches[1])) || (matches[4] && /^[+-]/.test(matches[3]))) {
      return null;
    }

    const latitude = Number(matches[1]) * (matches[2]?.toUpperCase() === 'S' ? -1 : 1);
    const longitude = Number(matches[3]) * (matches[4]?.toUpperCase() === 'W' ? -1 : 1);

    return normalizeCoordinates(latitude, longitude);
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return normalizeCoordinates(
      record.lat ?? record.latitude,
      record.lng ?? record.lon ?? record.longitude
    );
  }

  return null;
}

/**
 * Narrow code-managed registry of independently verified representative points for regions.
 * Each entry maps a region ID to a verified city/point, its exact representative coordinates,
 * its expected country (ISO-2 and ISO-3), and localized names.
 *
 * NOTE: Only independently verified regions are registered here. Unknown regions fall back to
 * safe country-filtered geocoding or honest unavailability. Coverage is tracked transparently.
 */
export const VERIFIED_REGION_WEATHER_REGISTRY: Record<string, VerifiedWeatherLocation> = {
  // Praha: Prague center (Česko, CZ / CZE)
  '07441af1-fcb0-4751-b1fe-9527e1ef7b43': {
    regionId: '07441af1-fcb0-4751-b1fe-9527e1ef7b43',
    pointName: {
      cs: 'Praha',
      en: 'Prague',
      de: 'Prag',
      fr: 'Prague',
      es: 'Praga',
    },
    countryCode: 'CZ',
    countryId: 'CZE',
    latitude: 50.08804,
    longitude: 14.42076,
    verifiedDate: '2026-10-20',
  },
  // Kréta: Heraklion / Irákleio (Řecko, GR / GRC)
  '8e247369-e7ac-4402-8f23-e06791770f8c': {
    regionId: '8e247369-e7ac-4402-8f23-e06791770f8c',
    pointName: {
      cs: 'Heraklion',
      en: 'Heraklion',
      de: 'Heraklion',
      fr: 'Héraklion',
      es: 'Heraclión',
    },
    countryCode: 'GR',
    countryId: 'GRC',
    latitude: 35.3387,
    longitude: 25.1442,
    verifiedDate: '2026-10-20',
  },
  // Istrie: Pula (Chorvatsko, HR / HRV)
  '2f2255c8-90bf-45aa-aa51-60629cb51575': {
    regionId: '2f2255c8-90bf-45aa-aa51-60629cb51575',
    pointName: {
      cs: 'Pula',
      en: 'Pula',
      de: 'Pula',
      fr: 'Pula',
      es: 'Pula',
    },
    countryCode: 'HR',
    countryId: 'HRV',
    latitude: 44.86833,
    longitude: 13.84806,
    verifiedDate: '2026-10-20',
  },
  // Algarve: Faro (Portugalsko, PT / PRT)
  'fc4c4e95-6d5b-4054-93ea-7fc411281730': {
    regionId: 'fc4c4e95-6d5b-4054-93ea-7fc411281730',
    pointName: {
      cs: 'Faro',
      en: 'Faro',
      de: 'Faro',
      fr: 'Faro',
      es: 'Faro',
    },
    countryCode: 'PT',
    countryId: 'PRT',
    latitude: 37.01869,
    longitude: -7.92716,
    verifiedDate: '2026-10-20',
  },
  // Francouzské Alpy, Lyon a Jura: Grenoble (Francie, FR / FRA)
  'bdefc8ee-5bad-4c3e-9172-a742a6926360': {
    regionId: 'bdefc8ee-5bad-4c3e-9172-a742a6926360',
    pointName: {
      cs: 'Grenoble',
      en: 'Grenoble',
      de: 'Grenoble',
      fr: 'Grenoble',
      es: 'Grenoble',
    },
    countryCode: 'FR',
    countryId: 'FRA',
    latitude: 45.17869,
    longitude: 5.71479,
    verifiedDate: '2026-10-20',
  },
  // Střední Dalmácie: Split (Chorvatsko, HR / HRV)
  'a9218abe-3308-49bf-8c9c-2b04651e056a': {
    regionId: 'a9218abe-3308-49bf-8c9c-2b04651e056a',
    pointName: {
      cs: 'Split',
      en: 'Split',
      de: 'Split',
      fr: 'Split',
      es: 'Split',
    },
    countryCode: 'HR',
    countryId: 'HRV',
    latitude: 43.50891,
    longitude: 16.43915,
    verifiedDate: '2026-10-20',
  },
};

export function getVerifiedRegionWeather(regionId: string | null | undefined): VerifiedWeatherLocation | null {
  if (!regionId || typeof regionId !== 'string') {
    return null;
  }
  return VERIFIED_REGION_WEATHER_REGISTRY[regionId] ?? null;
}

export function filterGeocodingResultsByCountry(
  results: unknown[],
  expectedCountryCode: string
): GeocodingLocationResult[] {
  const targetIso2 = toIso2CountryCode(expectedCountryCode);
  if (!targetIso2 || !Array.isArray(results)) {
    return [];
  }

  const valid: GeocodingLocationResult[] = [];

  for (const item of results) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;

    const itemCountryCode = typeof rec.country_code === 'string' ? rec.country_code.toUpperCase() : null;
    if (itemCountryCode !== targetIso2) {
      continue;
    }

    const coords = normalizeCoordinates(rec.latitude, rec.longitude);
    if (!coords) {
      continue;
    }

    const name = typeof rec.name === 'string' && rec.name.trim().length > 0 ? rec.name.trim() : '';
    if (!name) {
      continue;
    }

    const pop = typeof rec.population === 'number' && Number.isFinite(rec.population) ? rec.population : undefined;

    valid.push({
      id: typeof rec.id === 'number' ? rec.id : undefined,
      name,
      latitude: coords.latitude,
      longitude: coords.longitude,
      country_code: itemCountryCode,
      country: typeof rec.country === 'string' ? rec.country : undefined,
      population: pop,
    });
  }

  // Prefer results with higher population when multiple results match in expected country
  valid.sort((a, b) => (b.population ?? 0) - (a.population ?? 0));

  return valid;
}
