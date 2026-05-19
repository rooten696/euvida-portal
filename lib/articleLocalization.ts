import type {
  Article,
  LocalizedField,
  PracticalInfo,
  SupportedLocale,
} from './articleTypes';
import { supportedLocales } from './articleTypes';

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}

export function normalizeLocale(locale: string | null | undefined): SupportedLocale {
  return locale && isSupportedLocale(locale) ? locale : 'cs';
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

export function getLocalizedValue(
  object: LocalizedField | Record<string, unknown>,
  locale: string,
  fallbackLocale = 'cs'
): string | null {
  if (!object) {
    return null;
  }

  if (typeof object === 'string') {
    return cleanText(object);
  }

  if (!isRecord(object)) {
    return null;
  }

  const currentLocale = normalizeLocale(locale);
  const fallback = normalizeLocale(fallbackLocale);
  const firstAvailable = Object.values(object).find(
    (value) => cleanText(value) !== null
  );

  return cleanText(object[currentLocale]) ?? cleanText(object[fallback]) ?? cleanText(firstAvailable);
}

export function getArticleTitle(article: Article, locale: string): string {
  const currentLocale = normalizeLocale(locale);

  if (currentLocale === 'cs') {
    return cleanText(article.title) ?? '';
  }

  const translated = article.translations?.[currentLocale]?.title;

  return cleanText(translated) ?? cleanText(article.title) ?? '';
}

export function getArticleExcerpt(article: Article, locale: string): string | null {
  const currentLocale = normalizeLocale(locale);

  if (currentLocale === 'cs') {
    return cleanText(article.excerpt);
  }

  const translated = article.translations?.[currentLocale]?.excerpt;

  return cleanText(translated) ?? cleanText(article.excerpt);
}

export function getArticleContent(article: Article, locale: string): string {
  const currentLocale = normalizeLocale(locale);

  if (currentLocale === 'cs') {
    return cleanText(article.content) ?? '';
  }

  const translated = article.translations?.[currentLocale]?.content;

  return cleanText(translated) ?? cleanText(article.content) ?? '';
}

export function getLocalizedArticle(article: Article, locale: string) {
  const title = getArticleTitle(article, locale);

  return {
    title,
    excerpt: getArticleExcerpt(article, locale),
    content: getArticleContent(article, locale),
    imageAlt: getLocalizedValue(article.image_alt, locale) ?? title,
  };
}

export function getLocalizedPracticalInfo(
  practicalInfo: Article['practical_info'],
  locale: string,
  fallbackLocale = 'cs'
): PracticalInfo | null {
  if (!practicalInfo) {
    return null;
  }

  const currentLocale = normalizeLocale(locale);
  const fallback = normalizeLocale(fallbackLocale);

  return (
    practicalInfo[currentLocale] ??
    practicalInfo[fallback] ??
    Object.values(practicalInfo).find((value) => Boolean(value)) ??
    null
  );
}

export function stripFirstMarkdownH1(markdown: string): string {
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/);
  const firstContentLine = lines.findIndex((line) => line.trim().length > 0);

  if (firstContentLine === -1) {
    return '';
  }

  const line = lines[firstContentLine].trimStart();

  if (/^#(?!#)\s+/.test(line)) {
    lines.splice(firstContentLine, 1);
  }

  return lines.join('\n').trimStart();
}

export function getLocationName(
  location: { name?: string | null; translations?: Record<string, { name?: string | null } | undefined> | null } | null,
  locale: string
): string | null {
  if (!location) {
    return null;
  }

  const currentLocale = normalizeLocale(locale);
  return cleanText(location.translations?.[currentLocale]?.name) ?? cleanText(location.name);
}
