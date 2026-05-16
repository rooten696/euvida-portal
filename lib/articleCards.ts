import { getArticleLabel } from './articleLabels';
import { formatPriceItem, sortBySortOrder } from './articleFormatting';
import {
  getArticleContent,
  getArticleExcerpt,
  getLocalizedArticle,
  normalizeLocale,
  stripFirstMarkdownH1,
} from './articleLocalization';
import { getBooleanLabel, getCategoryLabel } from './articleLabels';
import type { Article, SupportedLocale } from './articleTypes';

export type ArticleCardData = {
  id?: string | null;
  slug: string;
  title: string;
  excerpt: string | null;
  imageUrl?: string | null;
  imageAlt: string;
  category?: string | null;
  categoryLabel?: string | null;
  countryId?: string | null;
  countryName?: string | null;
  regionId?: string | null;
  regionName?: string | null;
  readingTimeMinutes?: number | string | null;
  featured?: boolean | null;
  createdAt?: string | null;
  badges?: string[];
};

type ArticleCardLocationInput = {
  countryName?: string | null;
  regionName?: string | null;
};

export function plainArticleExcerpt(article: Article, locale: string): string | null {
  const excerpt = getArticleExcerpt(article, locale);

  if (excerpt) {
    return excerpt;
  }

  const content = stripFirstMarkdownH1(getArticleContent(article, locale))
    .replace(/[#>*_`~\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);

  return content.length > 0 ? content : null;
}

export function humanizeCategory(category: string | null | undefined): string | null {
  if (!category) {
    return null;
  }

  const humanized = category
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!humanized) {
    return null;
  }

  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}

export function getArticleCategoryLabel(
  category: string | null | undefined,
  locale: string
): string | null {
  return getCategoryLabel(category, locale);
}

function isSwimmingArticle(article: Article): boolean {
  const placeType = article.visit_info?.place_type;

  return (
    article.category === 'natural_swimming' ||
    placeType === 'natural_swimming' ||
    placeType === 'swimming_pool' ||
    placeType === 'beach'
  );
}

function isLandmarkOrPlaceArticle(article: Article): boolean {
  const category = article.category;
  const placeType = article.visit_info?.place_type;

  return (
    category === 'landmark' ||
    category === 'place' ||
    category === 'places' ||
    placeType === 'landmark'
  );
}

function getFirstPriceBadge(article: Article, locale: SupportedLocale): string | null {
  const items = article.prices_info?.items;

  if (!items || items.length === 0) {
    return null;
  }

  const formattedPrice = sortBySortOrder(items)
    .map((item) => formatPriceItem(item, locale, article.prices_info?.currency)?.value)
    .find((value): value is string => Boolean(value));

  return formattedPrice
    ? `${getArticleLabel(locale, 'prices')}: ${formattedPrice}`
    : null;
}

function getParkingBadge(article: Article, locale: SupportedLocale): string | null {
  const items = article.access_info?.items;
  const parkingItem = items?.find(
    (item) =>
      (item.mode === 'parking' || item.mode === 'car') &&
      typeof item.parking_available === 'boolean'
  );

  if (!parkingItem || typeof parkingItem.parking_available !== 'boolean') {
    return null;
  }

  const value = getBooleanLabel(parkingItem.parking_available, locale);

  return value ? `${getArticleLabel(locale, 'parking')}: ${value}` : null;
}

function getReadingTimeBadge(article: Article, locale: SupportedLocale): string | null {
  if (!article.reading_time_minutes) {
    return null;
  }

  return `${getArticleLabel(locale, 'readingTime')}: ${article.reading_time_minutes} min`;
}

function getBookingBadge(article: Article, locale: SupportedLocale): string | null {
  const value = getBooleanLabel(article.visit_info?.booking_recommended, locale);

  return value ? `${getArticleLabel(locale, 'bookingRecommended')}: ${value}` : null;
}

function getArticleCardBadges(article: Article, locale: SupportedLocale): string[] {
  const badges: string[] = [];

  if (isSwimmingArticle(article)) {
    if (typeof article.visit_info?.nudist_beach === 'boolean') {
      const value = getBooleanLabel(article.visit_info.nudist_beach, locale);

      badges.push(`${getArticleLabel(locale, 'nudistBeach')}: ${value}`);
    }

    const parkingBadge = getParkingBadge(article, locale);
    if (parkingBadge) {
      badges.push(parkingBadge);
    }

    const priceBadge = getFirstPriceBadge(article, locale);
    if (priceBadge) {
      badges.push(priceBadge);
    }

    return badges.slice(0, 3);
  }

  if (isLandmarkOrPlaceArticle(article)) {
    const readingTimeBadge = getReadingTimeBadge(article, locale);
    if (readingTimeBadge) {
      badges.push(readingTimeBadge);
    }

    const bookingBadge = getBookingBadge(article, locale);
    if (bookingBadge) {
      badges.push(bookingBadge);
    }

    const priceBadge = getFirstPriceBadge(article, locale);
    if (priceBadge) {
      badges.push(priceBadge);
    }

    return badges.slice(0, 3);
  }

  return badges;
}

export function toArticleCardData(
  article: Article,
  locale: string,
  location: ArticleCardLocationInput = {}
): ArticleCardData {
  const currentLocale: SupportedLocale = normalizeLocale(locale);
  const localized = getLocalizedArticle(article, currentLocale);

  return {
    id: article.id,
    slug: article.slug,
    title: localized.title,
    excerpt: localized.excerpt ?? plainArticleExcerpt(article, currentLocale),
    imageUrl: article.image_url,
    imageAlt: localized.imageAlt,
    category: article.category,
    categoryLabel: getArticleCategoryLabel(article.category, currentLocale),
    countryId: article.country_id,
    countryName: location.countryName,
    regionId: article.region_id,
    regionName: location.regionName,
    readingTimeMinutes: article.reading_time_minutes,
    featured: article.featured,
    createdAt: article.created_at,
    badges: getArticleCardBadges(article, currentLocale),
  };
}
