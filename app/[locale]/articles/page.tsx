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
  'id, slug, title, excerpt, content, translations, image_url, image_alt, country_id, region_id, category, practical_info, visit_info, published, featured, created_at, reading_time_minutes';

type ArticlesPageProps = {
  params: Promise<{ locale: string }>;
};

type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

const articlesMetadata: Record<SupportedLocale, { title: string; description: string }> = {
  cs: {
    title: 'Bikeparky a trailcentra v Evropě | Euvida',
    description: 'Kompletní přehled evropských bikeparků, trailcenter, lanovek, půjčoven a praktických tipů na ježdění.',
  },
  en: {
    title: 'European Bike Parks & Trail Centers | Euvida',
    description: 'Complete directory of European bike parks, trail networks, uplifts, bike rentals, and trip planning.',
  },
  de: {
    title: 'Europäische Bikeparks & Trailcenter | Euvida',
    description: 'Vollständige Übersicht europäischer Bikeparks, Trailcenter, Bergbahnen, Bikeverleih und MTB-Planung.',
  },
  fr: {
    title: 'Bike parks et trail centers en Europe | Euvida',
    description: 'Guide complet des bike parks européens, trail centers, remontées mécaniques, location de VTT et préparation.',
  },
  es: {
    title: 'Bike parks y trail centers en Europa | Euvida',
    description: 'Catálogo completo de bike parks europeos, centros de senderos, remontes, alquiler de bicis y planificación MTB.',
  },
};

function categoryOptions(articles: Article[], locale: SupportedLocale): FilterOption[] {
  let lift = 0;
  let beginner = 0;
  let rental = 0;
  let trailMap = 0;

  for (const article of articles) {
    const v = (article.visit_info as Record<string, unknown>) || {};
    const p = (article.practical_info as Record<string, Record<string, unknown>>) || {};
    const pl = p[locale] || p.cs || p.en || {};

    if (v.lift_available === true || Boolean(pl.lift)) {
      lift++;
    }
    if (v.beginner_friendly === true || v.family_friendly === true) {
      beginner++;
    }
    if (
      v.bike_rental_available === true ||
      v.service_available === true ||
      Boolean(pl.rental_service) ||
      Boolean(pl.bike_rental)
    ) {
      rental++;
    }
    if (Boolean(pl.trail_map_url) || Boolean(pl.trail_map)) {
      trailMap++;
    }
  }

  const options: FilterOption[] = [
    { value: 'lift', label: getArticleCategoryLabel('lift', locale) ?? 'Lanovka & vlek', count: lift },
    { value: 'beginner', label: getArticleCategoryLabel('beginner', locale) ?? 'Pro začátečníky & rodiny', count: beginner },
    { value: 'rental', label: getArticleCategoryLabel('rental', locale) ?? 'Půjčovna & servis', count: rental },
    { value: 'trail_map', label: getArticleCategoryLabel('trail_map', locale) ?? 'Mapa trailů', count: trailMap },
  ];

  return options.filter((opt) => (opt.count ?? 0) > 0);
}

export const revalidate = 86400;

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
      .eq('category', 'bike_trail')
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
  const countryNamesById = Object.fromEntries(countryNameById);
  const regionNamesById = Object.fromEntries(regionNameById);
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
      countryNamesById={countryNamesById}
      regionNamesById={regionNamesById}
    />
  );
}
