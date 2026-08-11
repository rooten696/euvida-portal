import type { AccessInfo, SourceInfo } from '@/lib/articleTypes';

export type WaterQualityLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type WaterQualityStatus = {
  sourceUrl: string;
  sourceHost: string;
  date: string;
  level: WaterQualityLevel;
  label: string;
  note?: string;
  checkedAt: string;
};

type SourceContainer = SourceInfo & {
  items?: unknown;
};

const OFFICIAL_WATER_HOSTS = [
  'hygpraha.cz',
  'khsbrno.cz',
  'khsova.cz',
  'khslbc.cz',
  'khsstc.cz',
  'khsjih.cz',
  'khshk.cz',
  'khsusti.cz',
];

const QUALITY_LABELS: Record<WaterQualityLevel, string> = {
  0: 'Měření nebylo provedeno',
  1: 'Voda vhodná ke koupání',
  2: 'Voda vhodná ke koupání se zhoršenými smyslově postižitelnými vlastnostmi',
  3: 'Zhoršená jakost vody',
  4: 'Voda nevhodná ke koupání',
  5: 'Voda nebezpečná ke koupání',
};

const EEA_ARCGIS_QUERY_URL =
  'https://water.discomap.eea.europa.eu/arcgis/rest/services/BathingWater/BathingWater_Dyna_WM/MapServer/0/query';
const EEA_SOURCE_URL =
  'https://www.eea.europa.eu/en/analysis/maps-and-charts/state-of-bathing-waters-in-2025';

const EEA_QUALITY_LABELS: Record<string, { level: WaterQualityLevel; label: string }> = {
  excellent: { level: 1, label: 'Vynikající kvalita vody podle EEA/WISE' },
  good: { level: 2, label: 'Dobrá kvalita vody podle EEA/WISE' },
  sufficient: { level: 3, label: 'Dostatečná kvalita vody podle EEA/WISE' },
  poor: { level: 5, label: 'Špatná kvalita vody podle EEA/WISE' },
  'not classified': { level: 0, label: 'Kvalita vody zatím není klasifikována podle EEA/WISE' },
};

function decodeHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&#8222;|&#8220;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, ' '));
}

function toAbsoluteUrl(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).toString();
  } catch {
    return null;
  }
}

function isOfficialWaterUrl(rawUrl: string): boolean {
  const url = toAbsoluteUrl(rawUrl);
  if (!url) return false;

  const host = new URL(url).hostname.replace(/^www\./, '');
  return OFFICIAL_WATER_HOSTS.some((officialHost) => host === officialHost || host.endsWith(`.${officialHost}`));
}

function getWaterSourceUrls(sourceInfo: SourceInfo | null | undefined): string[] {
  const container = (sourceInfo ?? {}) as SourceContainer;
  const sources = [
    ...(Array.isArray(container.sources) ? container.sources : []),
    ...(Array.isArray(container.items) ? container.items : []),
  ];

  return Array.from(
    new Set(
      sources
        .map((source) => (typeof source.url === 'string' ? source.url : null))
        .filter((url): url is string => Boolean(url && isOfficialWaterUrl(url))),
    ),
  );
}

function normalizeLevelFromFilename(filename: string, host: string): WaterQualityLevel | null {
  const match = filename.match(/(?:koupaliste_|water-|\/s)([0-5x])(?:\.|_|-|$)/i);
  if (!match) return null;

  if (match[1].toLowerCase() === 'x') return 0;
  const raw = Number(match[1]);

  if (host.includes('khsova.cz')) {
    return raw as WaterQualityLevel;
  }

  return raw as WaterQualityLevel;
}

function normalizeLevelFromText(text: string): WaterQualityLevel | null {
  const value = stripTags(text).toLowerCase();
  if (value.includes('zákaz koupání') || value.includes('zakaz koupani') || value.includes('nebezpečná')) return 5;
  if (value.includes('nevhodná ke koupání') || value.includes('nevhodna ke koupani')) return 4;
  if (value.includes('zhoršená jakost') || value.includes('zhoršena jakost')) return 3;
  if (value.includes('zhoršenými smyslově') || value.includes('zhoršenymi smyslove')) return 2;
  if (value.includes('vhodná ke koupání') || value.includes('vhodna ke koupani')) return 1;
  if (value.includes('měření nebylo provedeno') || value.includes('mereni nebylo provedeno')) return 0;
  return null;
}

function parseFullDate(value: string): Date | null {
  const text = stripTags(value).toLowerCase();
  const numericMatch = text.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (numericMatch) {
    return new Date(Number(numericMatch[3]), Number(numericMatch[2]) - 1, Number(numericMatch[1]));
  }

  const monthNames: Record<string, number> = {
    ledna: 0,
    února: 1,
    unora: 1,
    března: 2,
    brezna: 2,
    dubna: 3,
    května: 4,
    kvetna: 4,
    června: 5,
    cervna: 5,
    července: 6,
    cervence: 6,
    srpna: 7,
    září: 8,
    zari: 8,
    října: 9,
    rijna: 9,
    listopadu: 10,
    prosince: 11,
  };
  const wordMatch = text.match(/(\d{1,2})\.\s*([a-zá-ž]+)\s*(\d{4})/i);
  if (!wordMatch) return null;
  const month = monthNames[wordMatch[2]];
  if (month === undefined) return null;
  return new Date(Number(wordMatch[3]), month, Number(wordMatch[1]));
}

function parseShortDate(value: string, year: number): Date | null {
  const match = stripTags(value).match(/(\d{1,2})\.\s*(\d{1,2})\.?/);
  if (!match) return null;
  return new Date(year, Number(match[2]) - 1, Number(match[1]));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
}

function makeStatus(
  sourceUrl: string,
  date: Date,
  level: WaterQualityLevel,
  label?: string,
  note?: string,
): WaterQualityStatus {
  return {
    sourceUrl,
    sourceHost: new URL(sourceUrl).hostname.replace(/^www\./, ''),
    date: formatDate(date),
    level,
    label: label || QUALITY_LABELS[level],
    note: note ? stripTags(note) : undefined,
    checkedAt: new Date().toISOString(),
  };
}

function pickNewest(rows: WaterQualityStatus[]): WaterQualityStatus | null {
  return rows.find((row) => row.level !== 0) ?? rows[0] ?? null;
}

function extractGpsFromAccessInfo(accessInfo: AccessInfo | null | undefined): { lat: number; lon: number } | null {
  const values: string[] = [];

  const collect = (value: unknown) => {
    if (typeof value === 'string') {
      values.push(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if (value && typeof value === 'object') {
      Object.values(value).forEach(collect);
    }
  };

  collect(accessInfo);

  const text = values.join(' ');
  const match = text.match(/(-?\d{1,2}(?:[.,]\d+)?)\s*°?\s*,\s*(-?\d{1,3}(?:[.,]\d+)?)\s*°?/);
  if (!match) return null;

  const lat = Number(match[1].replace(',', '.'));
  const lon = Number(match[2].replace(',', '.'));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

  return { lat, lon };
}

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const radiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

type EeaFeature = {
  attributes?: {
    bathingWaterName?: string | null;
    countryCode?: string | null;
    countryName?: string | null;
    qualityStatus?: string | null;
    bwProfileLink?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
};

function getEeaFeatureDistance(feature: EeaFeature, point: { lat: number; lon: number }): number {
  const lat = Number(feature.attributes?.latitude);
  const lon = Number(feature.attributes?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Number.POSITIVE_INFINITY;
  }

  return distanceKm(point, { lat, lon });
}

function statusFromEeaFeature(
  feature: EeaFeature,
  articlePoint: { lat: number; lon: number },
): WaterQualityStatus | null {
  const attributes = feature.attributes ?? {};
  const rawStatus = attributes.qualityStatus?.trim().toLowerCase();
  const status = rawStatus ? EEA_QUALITY_LABELS[rawStatus] : null;
  const lat = Number(attributes.latitude);
  const lon = Number(attributes.longitude);

  if (!status || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const sourceUrl = toAbsoluteUrl(attributes.bwProfileLink || '') ?? EEA_SOURCE_URL;
  const name = stripTags(attributes.bathingWaterName ?? '');
  const country = stripTags(attributes.countryName ?? attributes.countryCode ?? '');
  const distance = distanceKm(articlePoint, { lat, lon });
  const noteParts = [
    name ? `Nejbližší monitorované koupací místo: ${name}` : null,
    country || null,
    `vzdálenost přibližně ${distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}`,
    'roční klasifikace EEA/WISE, aktuální zákazy a mimořádné události ověřte u národního zdroje',
  ].filter(Boolean);

  return {
    sourceUrl,
    sourceHost: new URL(sourceUrl).hostname.replace(/^www\./, ''),
    date: 'sezóna 2025',
    level: status.level,
    label: status.label,
    note: noteParts.join(' - '),
    checkedAt: new Date().toISOString(),
  };
}

async function getEeaWaterQualityByGps(accessInfo: AccessInfo | null | undefined): Promise<WaterQualityStatus | null> {
  const point = extractGpsFromAccessInfo(accessInfo);
  if (!point) return null;

  const params = new URLSearchParams({
    f: 'json',
    where: '1=1',
    outFields: 'bathingWaterName,countryCode,countryName,qualityStatus,bwProfileLink,latitude,longitude',
    returnGeometry: 'false',
    geometry: JSON.stringify({
      x: point.lon,
      y: point.lat,
      spatialReference: { wkid: 4326 },
    }),
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    distance: '5',
    units: 'esriSRUnit_Kilometer',
  });

  const response = await fetch(`${EEA_ARCGIS_QUERY_URL}?${params}`, {
    next: { revalidate: 7 * 24 * 60 * 60 },
    headers: {
      'user-agent': 'Euvida water-quality preview (+https://www.euvida.eu/)',
      accept: 'application/json',
    },
  });

  if (!response.ok) return null;

  const data = (await response.json().catch(() => null)) as { features?: EeaFeature[] } | null;
  const statuses = (data?.features ?? [])
    .sort((a, b) => getEeaFeatureDistance(a, point) - getEeaFeatureDistance(b, point))
    .map((feature) => statusFromEeaFeature(feature, point))
    .filter((status): status is WaterQualityStatus => Boolean(status));

  return statuses[0] ?? null;
}

function parseLiberec(html: string, sourceUrl: string): WaterQualityStatus | null {
  const rows: WaterQualityStatus[] = [];
  const rowRegex =
    /<div class="w-i">[\s\S]*?<img[^>]+src="([^"]+)"[^>]+alt="([^"]*)"[\s\S]*?<div class="dat">([^<]+)<\/div>[\s\S]*?<div class="txt">([\s\S]*?)<\/div>/gi;

  for (const match of html.matchAll(rowRegex)) {
    const level = normalizeLevelFromFilename(match[1], 'khslbc.cz') ?? normalizeLevelFromText(match[2]);
    const date = parseFullDate(match[3]);
    if (level === null || !date) continue;
    rows.push(makeStatus(sourceUrl, date, level, stripTags(match[2]) || QUALITY_LABELS[level], match[4]));
  }

  return pickNewest(rows);
}

function parseKhsJih(html: string, sourceUrl: string): WaterQualityStatus | null {
  const yearMatch = html.match(/Hodnoty za rok:\s*(\d{4})/i);
  const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
  const rowRegex =
    /<tr>\s*<td[^>]*class="datum"[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*class="hodnota"[^>]*>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>/gi;

  for (const match of html.matchAll(rowRegex)) {
    const date = parseShortDate(match[1], year);
    const labelMatch = match[2].match(/title="([^"]+)"/i);
    const label = labelMatch ? decodeHtml(labelMatch[1]) : '';
    const level = normalizeLevelFromText(label);
    if (!date || level === null) continue;
    return makeStatus(sourceUrl, date, level, label || QUALITY_LABELS[level], match[3]);
  }

  return null;
}

function parseTableRows(html: string, sourceUrl: string, host: string): WaterQualityStatus | null {
  const rows: WaterQualityStatus[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;

  for (const rowMatch of html.matchAll(rowRegex)) {
    const row = rowMatch[1];
    const date = parseFullDate(row);
    if (!date) continue;

    const imageMatch = row.match(/<img[^>]+src=["']([^"']*(?:koupaliste_[0-5x]|water-[0-5]|\/s[0-5])[^"']*)["'][^>]*>/i);
    const level = imageMatch ? normalizeLevelFromFilename(imageMatch[1], host) : normalizeLevelFromText(row);
    if (level === null) continue;

    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => stripTags(cell[1]));
    const note = cells
      .slice(1)
      .filter((cell) => cell && !/^\d+([,.]\d+)?$/.test(cell) && !/^[0-5x]$/i.test(cell))
      .join(' - ');
    const label = normalizeLevelFromText(note) !== null ? note : QUALITY_LABELS[level];
    rows.push(makeStatus(sourceUrl, date, level, label, note && note !== label ? note : undefined));
  }

  rows.sort((a, b) => {
    const [ad, am, ay] = a.date.split('.').map((part) => Number(part.trim()));
    const [bd, bm, by] = b.date.split('.').map((part) => Number(part.trim()));
    return new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime();
  });

  return pickNewest(rows);
}

function parseWaterQualityHtml(html: string, sourceUrl: string): WaterQualityStatus | null {
  const host = new URL(sourceUrl).hostname.replace(/^www\./, '');

  if (host.includes('khslbc.cz')) {
    return parseLiberec(html, sourceUrl);
  }

  if (host.includes('khsjih.cz')) {
    return parseKhsJih(html, sourceUrl);
  }

  return parseTableRows(html, sourceUrl, host);
}

export async function getWaterQualityForArticle(
  sourceInfo: SourceInfo | null | undefined,
  accessInfo?: AccessInfo | null,
): Promise<WaterQualityStatus | null> {
  const urls = getWaterSourceUrls(sourceInfo);

  for (const sourceUrl of urls) {
    try {
      const response = await fetch(sourceUrl, {
        next: { revalidate: 6 * 60 * 60 },
        headers: {
          'user-agent': 'Euvida water-quality preview (+https://www.euvida.eu/)',
          accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) continue;
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html')) continue;

      const html = await response.text();
      const status = parseWaterQualityHtml(html, sourceUrl);
      if (status) return status;
    } catch {
      continue;
    }
  }

  try {
    return await getEeaWaterQualityByGps(accessInfo);
  } catch {
    return null;
  }
}
