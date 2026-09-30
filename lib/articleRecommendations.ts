export type ArticleCoordinates = {
  latitude: number;
  longitude: number;
};

export type RelatedArticleCandidate = {
  slug: string;
  regionId?: string | null;
  countryId?: string | null;
  category?: string | null;
  coordinates?: ArticleCoordinates | null;
};

export type RelatedArticleReason = 'distance' | 'region' | 'category';

export type RankedRelatedArticle<T extends RelatedArticleCandidate> = {
  article: T;
  reason: RelatedArticleReason;
  distanceKm?: number;
};

function normalizeCoordinates(latitude: unknown, longitude: unknown): ArticleCoordinates | null {
  const lat = typeof latitude === 'number' ? latitude : Number(latitude);
  const lng = typeof longitude === 'number' ? longitude : Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { latitude: lat, longitude: lng };
}

function coordinatesFromValue(value: unknown): ArticleCoordinates | null {
  if (typeof value === 'string') {
    const matches = value.match(/-?\d+(?:\.\d+)?/g);
    if (!matches || matches.length < 2) {
      return null;
    }
    return normalizeCoordinates(matches[0], matches[1]);
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  return normalizeCoordinates(
    record.lat ?? record.latitude,
    record.lng ?? record.lon ?? record.longitude
  );
}

export function extractArticleCoordinates(accessInfo: unknown, locale: string): ArticleCoordinates | null {
  if (!accessInfo || typeof accessInfo !== 'object') {
    return null;
  }

  const record = accessInfo as Record<string, unknown>;
  const localeOrder = Array.from(new Set([locale, 'cs', 'en', 'de', 'fr', 'es']));

  for (const localeKey of localeOrder) {
    const localized = record[localeKey];
    if (localized && typeof localized === 'object') {
      const coordinates = coordinatesFromValue((localized as Record<string, unknown>).gps);
      if (coordinates) {
        return coordinates;
      }
    }
  }

  const directCoordinates = coordinatesFromValue(record.gps);
  if (directCoordinates) {
    return directCoordinates;
  }

  if (Array.isArray(record.items)) {
    for (const item of record.items) {
      if (item && typeof item === 'object') {
        const coordinates = coordinatesFromValue((item as Record<string, unknown>).gps);
        if (coordinates) {
          return coordinates;
        }
      }
    }
  }

  return null;
}

export function haversineDistanceKm(a: ArticleCoordinates, b: ArticleCoordinates): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function rankRelatedArticles<T extends RelatedArticleCandidate>(
  current: RelatedArticleCandidate,
  candidates: T[],
  options: { limit?: number; maxDistanceKm?: number } = {}
): RankedRelatedArticle<T>[] {
  const limit = Math.max(0, options.limit ?? 3);
  const maxDistanceKm = options.maxDistanceKm ?? 150;
  const uniqueCandidates = Array.from(
    new Map(candidates.filter((candidate) => candidate.slug !== current.slug).map((candidate) => [candidate.slug, candidate])).values()
  );
  const selected: RankedRelatedArticle<T>[] = [];
  const selectedSlugs = new Set<string>();

  const add = (article: T, reason: RelatedArticleReason, distanceKm?: number) => {
    if (selected.length >= limit || selectedSlugs.has(article.slug)) {
      return;
    }
    selectedSlugs.add(article.slug);
    selected.push({ article, reason, ...(distanceKm === undefined ? {} : { distanceKm }) });
  };

  if (current.coordinates) {
    uniqueCandidates
      .flatMap((article) => {
        if (!article.coordinates) return [];
        const distanceKm = haversineDistanceKm(current.coordinates as ArticleCoordinates, article.coordinates);
        return distanceKm <= maxDistanceKm ? [{ article, distanceKm }] : [];
      })
      .sort((a, b) => a.distanceKm - b.distanceKm || a.article.slug.localeCompare(b.article.slug))
      .forEach(({ article, distanceKm }) => add(article, 'distance', distanceKm));
  }

  if (current.regionId) {
    uniqueCandidates
      .filter((article) => article.regionId === current.regionId)
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .forEach((article) => add(article, 'region'));
  }

  if (current.category) {
    uniqueCandidates
      .filter((article) => article.category === current.category)
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .forEach((article) => add(article, 'category'));
  }

  return selected;
}
