const ARTICLE_FALLBACK_IMAGES = {
  places: ['/fallbacks/articles/places-1.webp', '/fallbacks/articles/places-2.webp', '/fallbacks/articles/places-3.webp'],
  camping: ['/fallbacks/articles/camping-1.webp', '/fallbacks/articles/camping-2.webp', '/fallbacks/articles/camping-3.webp'],
  bike_trail: ['/fallbacks/articles/bike_trail-1.webp', '/fallbacks/articles/bike_trail-2.webp', '/fallbacks/articles/bike_trail-3.webp'],
  natural_swimming: ['/fallbacks/articles/natural_swimming-1.webp', '/fallbacks/articles/natural_swimming-2.webp', '/fallbacks/articles/natural_swimming-3.webp'],
  fkk: ['/fallbacks/articles/natural_swimming-1.webp', '/fallbacks/articles/natural_swimming-2.webp', '/fallbacks/articles/natural_swimming-3.webp'],
  outdoor_pool: ['/fallbacks/articles/outdoor_pool-1.webp', '/fallbacks/articles/outdoor_pool-2.webp', '/fallbacks/articles/outdoor_pool-3.webp'],
  trip: ['/fallbacks/articles/trip-1.webp', '/fallbacks/articles/trip-2.webp', '/fallbacks/articles/trip-3.webp'],
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

export function getArticleFallbackAlt(locale: string, categoryLabel?: string | null): string {
  const labels: Record<string, string> = {
    cs: 'AI ilustrace',
    en: 'AI illustration',
    de: 'KI-Illustration',
    fr: 'Illustration IA',
    es: 'Ilustración de IA',
  };
  const prefix = labels[locale] ?? labels.cs;

  return categoryLabel ? `${prefix}: ${categoryLabel}` : prefix;
}
