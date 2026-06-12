import type { Article, LocationRecord } from './articleTypes';

export const CZECH_ARTICLE_TARGET_ORIGIN = 'https://www.euvida.cz';

const EUVIDA_EU_HOSTS = new Set(['euvida.eu', 'www.euvida.eu']);
const CZECH_COUNTRY_KEYS = new Set([
  'cz',
  'cze',
  'cs',
  'czech',
  'czech republic',
  'czechia',
  'cesko',
  'ceska republika',
  'ceske republice',
]);

type ArticleLocationInput = Pick<Article, 'country_id'>;

type ArticleHrefInput = {
  slug: string;
  countryId?: string | null;
  countryName?: string | null;
};

function normalizeCountryValue(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isCzechCountryValue(value: string | null | undefined): boolean {
  const normalized = normalizeCountryValue(value);

  return normalized.length > 0 && CZECH_COUNTRY_KEYS.has(normalized);
}

function countryTranslationNames(country: LocationRecord | null | undefined): string[] {
  return Object.values(country?.translations ?? {})
    .map((translation) => translation?.name)
    .filter((name): name is string => Boolean(name));
}

export function isEuvidaEuHost(host: string | null | undefined): boolean {
  const hostname = (host ?? '').split(',')[0]?.trim().split(':')[0]?.toLocaleLowerCase('en-US');

  return EUVIDA_EU_HOSTS.has(hostname ?? '');
}

export function isCzechArticleLocation(
  article: ArticleLocationInput,
  country?: LocationRecord | null,
  countryName?: string | null
): boolean {
  const candidates = [
    article.country_id,
    country?.id,
    country?.name,
    countryName,
    ...countryTranslationNames(country),
  ];

  return candidates.some(isCzechCountryValue);
}

export function getCzechArticleUrl(locale: string, slug: string): string {
  return `${CZECH_ARTICLE_TARGET_ORIGIN}/${locale}/article/${slug}`;
}

export function getArticleHref(article: ArticleHrefInput, locale: string): string {
  if (
    isCzechArticleLocation(
      { country_id: article.countryId },
      null,
      article.countryName
    )
  ) {
    return getCzechArticleUrl(locale, article.slug);
  }

  return `/${locale}/article/${article.slug}`;
}

export function shouldRedirectCzechArticleToEuvidaCz(
  host: string | null | undefined,
  article: ArticleLocationInput,
  country?: LocationRecord | null
): boolean {
  return isEuvidaEuHost(host) && isCzechArticleLocation(article, country);
}
