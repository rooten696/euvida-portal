import ArticlesClient from '@/app/[locale]/articles/ArticlesClient';
import {
  getArticleCategoryLabel,
  toArticleCardData,
  type ArticleCardData,
} from '@/lib/articleCards';
import { normalizeLocale } from '@/lib/articleLocalization';
import type { Article, SupportedLocale } from '@/lib/articleTypes';
import { supportedLocales } from '@/lib/articleTypes';
import {
  type CountryDestination,
  type RegionDestination,
  getCountryDisplay,
  getRegionDisplay,
} from '@/lib/destinationTypes';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://euvida.eu';
const articleListSelect =
  'id, slug, title, excerpt, translations, image_url, image_alt, country_id, region_id, category, published, featured, created_at, reading_time_minutes';

type ArticlesPageProps = {
  params: Promise<{ locale: string }>;
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

export const revalidate = 604800;

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

export default async function ArticlesPage({ params }: ArticlesPageProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);

  const [articlesResult, countriesResult, regionsResult] = await Promise.all([
    supabase
      .from('articles')
      .select(articleListSelect)
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
  const articleCards: ArticleCardData[] = articles.map((article) =>
    toArticleCardData(article, locale, {
      countryName: article.country_id ? countryNameById.get(article.country_id) : null,
      regionName: article.region_id ? regionNameById.get(article.region_id) : null,
    })
  );

  return (
    <ArticlesClient
      locale={locale}
      articles={articleCards}
      categories={categoryOptions(articles, locale)}
    />
  );
}
