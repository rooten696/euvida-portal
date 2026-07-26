const ARTICLE_FALLBACK_IMAGES = {
  places: ['/fallbacks/articles/places-1.svg', '/fallbacks/articles/places-2.svg'],
  camping: ['/fallbacks/articles/camping-1.svg', '/fallbacks/articles/camping-2.svg'],
  bike_trail: ['/fallbacks/articles/bike_trail-1.svg', '/fallbacks/articles/bike_trail-2.svg'],
  natural_swimming: ['/fallbacks/articles/natural_swimming-1.svg', '/fallbacks/articles/natural_swimming-2.svg'],
  outdoor_pool: ['/fallbacks/articles/outdoor_pool-1.svg', '/fallbacks/articles/outdoor_pool-2.svg'],
  trip: ['/fallbacks/articles/trip-1.svg', '/fallbacks/articles/trip-2.svg'],
} as const;

type ArticleFallbackCategory = keyof typeof ARTICLE_FALLBACK_IMAGES;

const CATEGORY_ALIASES: Record<string, ArticleFallbackCategory> = {
  camp: 'camping',
  camps: 'camping',
  trips: 'trip',
  bikepark: 'bike_trail',
  bikeparks: 'bike_trail',
  pool: 'outdoor_pool',
  pools: 'outdoor_pool',
  swimming: 'natural_swimming',
};

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function normalizeArticleFallbackCategory(
  category: string | null | undefined
): ArticleFallbackCategory {
  const normalized = category?.trim().toLowerCase().replace(/-/g, '_');

  if (!normalized) {
    return 'places';
  }

  if (normalized in ARTICLE_FALLBACK_IMAGES) {
    return normalized as ArticleFallbackCategory;
  }

  return CATEGORY_ALIASES[normalized] ?? 'places';
}

export function isMissingArticleImage(imageUrl: string | null | undefined): boolean {
  const normalized = imageUrl?.trim();

  if (!normalized) {
    return true;
  }

  return (
    normalized === '/placeholder.png' ||
    normalized.endsWith('/placeholder.png') ||
    normalized.includes('/default_')
  );
}

export function getArticleFallbackImage(
  category: string | null | undefined,
  key = 'euvida',
  sequenceIndex?: number
): string {
  const fallbackCategory = normalizeArticleFallbackCategory(category);
  const images = ARTICLE_FALLBACK_IMAGES[fallbackCategory];
  const index = typeof sequenceIndex === 'number'
    ? Math.abs(sequenceIndex) % images.length
    : hashString(`${fallbackCategory}:${key}`) % images.length;

  return images[index];
}

export function getArticleImageWithFallback(
  imageUrl: string | null | undefined,
  category: string | null | undefined,
  key = 'euvida',
  sequenceIndex?: number
): string {
  return isMissingArticleImage(imageUrl)
    ? getArticleFallbackImage(category, key, sequenceIndex)
    : imageUrl!.trim();
}
