import ArticleCategoryExplorer from '@/app/components/article/ArticleCategoryExplorer';
import {
  getArticleCategoryLabel,
  toArticleCardData,
  type ArticleCardData,
} from '@/lib/articleCards';
import {
  getArticleContent,
  getArticleExcerpt,
  getArticleTitle,
  normalizeLocale,
} from '@/lib/articleLocalization';
import type { Article, SupportedLocale } from '@/lib/articleTypes';
import { supportedLocales } from '@/lib/articleTypes';
import { getDestinationLabel } from '@/lib/destinationLabels';
import {
  type CountryDestination,
  type RegionDestination,
  getCountryDisplay,
  getRegionDisplay,
} from '@/lib/destinationTypes';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://euvida.eu';
const articleSelect =
  'id, slug, title, excerpt, content, translations, image_url, image_alt, country_id, region_id, category, published, featured, created_at, reading_time_minutes';
const articleListSelect =
  'id, slug, title, excerpt, translations, image_url, image_alt, country_id, region_id, category, published, featured, created_at, reading_time_minutes';
const maxSearchQueryLength = 80;
const maxSearchTerms = 6;

type ArticlesPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type CountMap = Map<string, number>;

type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

const articlesMetadata: Record<SupportedLocale, { title: string; description: string }> = {
  cs: {
    title: 'Všechny články | Euvida',
    description: 'Kompletní přehled praktických cestovatelských článků na Euvidě.',
  },
  en: {
    title: 'All articles | Euvida',
    description: 'A complete overview of practical travel articles on Euvida.',
  },
  de: {
    title: 'Alle Artikel | Euvida',
    description: 'Eine komplette Übersicht praktischer Reiseartikel auf Euvida.',
  },
  fr: {
    title: 'Tous les articles | Euvida',
    description: 'Tous les articles pratiques de voyage sur Euvida.',
  },
  es: {
    title: 'Todos los artículos | Euvida',
    description: 'Todos los artículos prácticos de viaje en Euvida.',
  },
};

function incrementCount(map: CountMap, key: string | null | undefined) {
  if (!key) {
    return;
  }

  map.set(key, (map.get(key) ?? 0) + 1);
}

function countBy<T>(items: T[], getKey: (item: T) => string | null | undefined): CountMap {
  const counts = new Map<string, number>();

  for (const item of items) {
    incrementCount(counts, getKey(item));
  }

  return counts;
}

function categoryOptions(articles: Article[], locale: SupportedLocale): FilterOption[] {
  const counts = countBy(articles, (article) => article.category);

  return [...counts.entries()]
    .map(([category, count]) => ({
      value: category,
      label: getArticleCategoryLabel(category, locale) ?? category,
      count,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, locale));
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

function getSearchQuery(
  searchParams: Record<string, string | string[] | undefined> | undefined
): string {
  const value = searchParams?.q ?? searchParams?.query ?? '';
  const firstValue = Array.isArray(value) ? value[0] : value;

  if (typeof firstValue !== 'string') {
    return '';
  }

  const query = firstValue.replace(/\s+/g, ' ').trim();

  if (query.length > maxSearchQueryLength) {
    return '';
  }

  return query;
}

function articleMatchesQuery(
  article: Article,
  locale: SupportedLocale,
  query: string,
  countryName?: string | null,
  regionName?: string | null
): boolean {
  if (!query) {
    return true;
  }

  const terms = normalizeSearchText(query)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxSearchTerms);

  if (terms.length === 0) {
    return true;
  }

  const haystack = normalizeSearchText(
    [
      getArticleTitle(article, locale),
      getArticleExcerpt(article, locale),
      getArticleContent(article, locale),
      article.category,
      getArticleCategoryLabel(article.category, locale),
      countryName,
      regionName,
    ]
      .filter(Boolean)
      .join(' ')
  );

  return terms.every((term) => haystack.includes(term));
}

export const revalidate = 1800;

export async function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: ArticlesPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const meta = articlesMetadata[locale];

  return {
    metadataBase: new URL(siteUrl),
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/articles`,
      languages: Object.fromEntries(
        supportedLocales.map((supportedLocale) => [
          supportedLocale,
          `/${supportedLocale}/articles`,
        ])
      ),
    },
  };
}

export default async function ArticlesPage({ params, searchParams }: ArticlesPageProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = getSearchQuery(resolvedSearchParams);
  const articleColumns: string = query ? articleSelect : articleListSelect;

  const [articlesResult, countriesResult, regionsResult] = await Promise.all([
    supabase
      .from('articles')
      .select(articleColumns)
      .eq('published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('countries')
      .select('id, name, flag, description, image_url, translations')
      .order('name'),
    supabase
      .from('regions')
      .select('id, country_id, name, language, description, image_url, translations')
      .order('name'),
  ]);

  if (articlesResult.error) {
    console.error('Chyba při načítání článků:', articlesResult.error);
  }

  if (countriesResult.error) {
    console.error('Chyba při načítání zemí:', countriesResult.error);
  }

  if (regionsResult.error) {
    console.error('Chyba při načítání regionů:', regionsResult.error);
  }

  const countries = ((countriesResult.data ?? []) as CountryDestination[]).map((country) =>
    getCountryDisplay(country, locale)
  );
  const regions = ((regionsResult.data ?? []) as RegionDestination[]).map((region) =>
    getRegionDisplay(region, locale)
  );
  const countryNameById = new Map(countries.map((country) => [country.id, country.name]));
  const regionNameById = new Map(regions.map((region) => [region.id, region.name]));

  const articles = ((articlesResult.data ?? []) as unknown) as Article[];
  const visibleArticles = query
    ? articles.filter((article) =>
        articleMatchesQuery(
          article,
          locale,
          query,
          article.country_id ? countryNameById.get(article.country_id) : null,
          article.region_id ? regionNameById.get(article.region_id) : null
        )
      )
    : articles;

  const articleCards: ArticleCardData[] = visibleArticles.map((article) =>
    toArticleCardData(article, locale, {
      countryName: article.country_id ? countryNameById.get(article.country_id) : null,
      regionName: article.region_id ? regionNameById.get(article.region_id) : null,
    })
  );
  const categories = categoryOptions(visibleArticles, locale);
  const heading = query
    ? `${getDestinationLabel(locale, 'searchResultsFor')} "${query}"`
    : getDestinationLabel(locale, 'allArticles');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <nav className="mb-8 text-sm font-bold text-slate-400">
          <Link href={`/${locale}`} className="hover:text-emerald-500 transition-colors">
            {getDestinationLabel(locale, 'home')}
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-slate-300">
            {query
              ? getDestinationLabel(locale, 'searchResults')
              : getDestinationLabel(locale, 'allArticles')}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-500">
              {query
                ? getDestinationLabel(locale, 'searchResults')
                : getDestinationLabel(locale, 'latestArticles')}
            </p>
            <h1 className="mt-2 break-words text-4xl font-black tracking-tight text-white md:text-6xl">
              {heading}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-400">
              {getDestinationLabel(locale, 'allArticlesIntro')}
            </p>
          </div>

          <form
            action={`/${locale}/articles`}
            className="rounded-2xl border border-white/10 bg-slate-900 p-3 shadow-xl"
          >
            <label htmlFor="article-search" className="sr-only">
              {getDestinationLabel(locale, 'articleSearchPlaceholder')}
            </label>
            <div className="flex gap-2">
              <input
                id="article-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder={getDestinationLabel(locale, 'articleSearchPlaceholder')}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-semibold text-white outline-none transition focus:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/10 placeholder-slate-400"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-4 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-400 cursor-pointer"
              >
                {getDestinationLabel(locale, 'articleSearchButton')}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
        {articleCards.length > 0 ? (
          <ArticleCategoryExplorer
            locale={locale}
            articles={articleCards}
            categories={categories}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-8 text-center text-sm font-medium text-slate-400 shadow-md">
            {query
              ? getDestinationLabel(locale, 'noSearchResults')
              : getDestinationLabel(locale, 'noArticles')}
          </div>
        )}
      </section>
    </main>
  );
}
