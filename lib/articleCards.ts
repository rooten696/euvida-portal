import {
  getArticleContent,
  getArticleExcerpt,
  getLocalizedArticle,
  normalizeLocale,
  stripFirstMarkdownH1,
} from './articleLocalization';
import { getCategoryLabel } from './articleLabels';
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

export function getArticleCardBadges(): string[] {
  return [];
}

export function toArticleCardData(
  article: Article,
  locale: string,
  location: ArticleCardLocationInput = {}
): ArticleCardData {
  const currentLocale: SupportedLocale = normalizeLocale(locale);
  const localized = getLocalizedArticle(article, currentLocale);

  const badges = getArticleCardBadges();

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
    badges: badges.length > 0 ? badges : undefined,
  };
}
