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

export function getLocalizedValue(
  object: LocalizedField,
  locale: string,
  fallbackLocale = 'cs'
): string | null {
  if (!object) {
    return null;
  }

  if (typeof object === 'string') {
    return cleanText(object);
  }

  const currentLocale = normalizeLocale(locale);
  const fallback = normalizeLocale(fallbackLocale);

  return (
    cleanText(object[currentLocale]) ??
    cleanText(object[fallback]) ??
    cleanText(Object.values(object).find((value) => cleanText(value)))
  );
}

export function getArticleTitle(article: Article, locale: string): string {
  const currentLocale = normalizeLocale(locale);
  const translated = article.translations?.[currentLocale]?.title;

  return cleanText(translated) ?? cleanText(article.title) ?? '';
}

export function getArticleExcerpt(article: Article, locale: string): string | null {
  const currentLocale = normalizeLocale(locale);
  const translated = article.translations?.[currentLocale]?.excerpt;

  return cleanText(translated) ?? cleanText(article.excerpt);
}

export function getArticleContent(article: Article, locale: string): string {
  const currentLocale = normalizeLocale(locale);
  const translated = article.translations?.[currentLocale]?.content;

  return cleanText(translated) ?? cleanText(article.content) ?? '';
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

  return practicalInfo[currentLocale] ?? practicalInfo[fallback] ?? null;
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
