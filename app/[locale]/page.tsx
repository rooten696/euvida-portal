import DestinationCard from '@/app/components/destination/DestinationCard';
import HomeArticleExplorer from '@/app/components/home/HomeArticleExplorer';
import SmartSearch, { type SmartSearchItem } from '@/app/components/search/SmartSearch';
import {
  getArticleCategoryLabel,
  toArticleCardData,
  type ArticleCardData,
} from '@/lib/articleCards';
import { normalizeLocale } from '@/lib/articleLocalization';
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
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Image from 'next/image';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const heroImage =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://euvida.eu';

const homeMetadata: Record<SupportedLocale, { title: string; description: string }> = {
  cs: {
    title: 'Euvida | Cestovatelský průvodce Evropou',
    description:
      'Praktické cestovatelské články, země a regiony Evropy pro výlety, koupání, památky i plánování cest.',
  },
  en: {
    title: 'Euvida | Travel guide to Europe',
    description:
      'Practical travel articles, countries, and regions across Europe for trips, swimming, landmarks, and planning.',
  },
  de: {
    title: 'Euvida | Reiseführer für Europa',
    description:
      'Praktische Reiseartikel, Länder und Regionen Europas für Ausflüge, Baden, Sehenswürdigkeiten und Reiseplanung.',
  },
  fr: {
    title: 'Euvida | Guide de voyage en Europe',
    description:
      'Articles pratiques, pays et régions d’Europe pour les sorties, la baignade, les monuments et la préparation de voyage.',
  },
  es: {
    title: 'Euvida | Guía de viaje por Europa',
    description:
      'Artículos prácticos, países y regiones de Europa para escapadas, baño, monumentos y planificación de viajes.',
  },
};

type PageProps = {
  params: Promise<{ locale: string }>;
};

type CountMap = Map<string, number>;

type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

function presentValues(values: Array<string | null | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value?.trim()));
}

function countMeta(value: number, label: string, locale: SupportedLocale): string {
  return `${value} ${label.toLocaleLowerCase(locale)}`;
}

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

function formatSupabaseError(error: unknown): string {
  if (!error) {
    return 'neznámá chyba';
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object') {
    const errorRecord = error as Record<string, unknown>;
    const usefulEntries = ['message', 'details', 'hint', 'code', 'name', 'status']
      .map((key) => [key, errorRecord[key]] as const)
      .filter(([, value]) => value !== undefined && value !== null && value !== '');

    if (usefulEntries.length > 0) {
      return usefulEntries
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', ');
    }
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function warnHomepageLoadError(resource: string, error: unknown) {
  console.warn(`[Euvida] Nepodařilo se načíst ${resource}: ${formatSupabaseError(error)}`);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const meta = homeMetadata[locale];

  return {
    metadataBase: new URL(siteUrl),
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        supportedLocales.map((supportedLocale) => [supportedLocale, `/${supportedLocale}`])
      ),
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/${locale}`,
      images: [{ url: heroImage }],
    },
  };
}

export const revalidate = 3600;

export default async function HomePage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const t = await getTranslations('HomePage');

  let articlesQuery = supabase
    .from('articles')
    .select(
      'id, slug, title, excerpt, content, translations, image_url, image_alt, country_id, region_id, category, published, featured, created_at, reading_time_minutes'
    )
    .eq('published', true);

  if (process.env.NEXT_PUBLIC_SITE_MODE === 'cz') {
    articlesQuery = articlesQuery.eq('country_id', 'CZE');
  }

  const [articlesResult, countriesResult, regionsResult] = await Promise.all([
    articlesQuery.order('created_at', { ascending: false }),
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
    warnHomepageLoadError('články', articlesResult.error);
  }

  if (countriesResult.error) {
    warnHomepageLoadError('země', countriesResult.error);
  }

  if (regionsResult.error) {
    warnHomepageLoadError('regiony', regionsResult.error);
  }

  const articles = (articlesResult.data ?? []) as Article[];
  const countries = ((countriesResult.data ?? []) as CountryDestination[]).map((country) =>
    getCountryDisplay(country, locale)
  );
  const regions = ((regionsResult.data ?? []) as RegionDestination[]).map((region) =>
    getRegionDisplay(region, locale)
  );

  const articleCountByCountry = countBy(articles, (article) => article.country_id);
  const articleCountByRegion = countBy(articles, (article) => article.region_id);
  const regionCountByCountry = countBy(regions, (region) => region.country_id);
  const countryNameById = new Map(countries.map((country) => [country.id, country.name]));
  const regionNameById = new Map(regions.map((region) => [region.id, region.name]));

  const articleCards: ArticleCardData[] = articles.map((article) =>
    toArticleCardData(article, locale, {
      countryName: article.country_id ? countryNameById.get(article.country_id) : null,
      regionName: article.region_id ? regionNameById.get(article.region_id) : null,
    })
  );
  const latestArticlesLimit = 18;
  const categories = categoryOptions(articles, locale);
  const countriesWithCounts = countries.map((country) => ({
    ...country,
    articleCount: articleCountByCountry.get(country.id) ?? 0,
    regionCount: regionCountByCountry.get(country.id) ?? 0,
  }));
  const countriesWithArticles = countriesWithCounts
    .filter((country) => country.articleCount > 0)
    .sort((left, right) => {
      if (right.articleCount !== left.articleCount) {
        return right.articleCount - left.articleCount;
      }

      return left.name.localeCompare(right.name, locale);
    });
  const extraCountries = countriesWithCounts
    .filter((country) => country.articleCount === 0)
    .sort((left, right) => {
      if (right.regionCount !== left.regionCount) {
        return right.regionCount - left.regionCount;
      }

      return left.name.localeCompare(right.name, locale);
    })
    .slice(0, 6);
  const homepageCountries = [...countriesWithArticles, ...extraCountries];
  const regionsWithCounts = regions.map((region) => ({
    ...region,
    articleCount: articleCountByRegion.get(region.id) ?? 0,
    countryName: countryNameById.get(region.country_id) ?? null,
  }));
  const selectedRegions = regionsWithCounts
    .filter((region) => region.articleCount > 0)
    .sort((left, right) => {
      if (right.articleCount !== left.articleCount) {
        return right.articleCount - left.articleCount;
      }

      return left.name.localeCompare(right.name, locale);
    })
    .slice(0, 8);
  const articlesCountLabel = getDestinationLabel(locale, 'articlesCount');
  const regionsCountLabel = getDestinationLabel(locale, 'regionsCount');
  const searchItems: SmartSearchItem[] = [
    ...articleCards.map((article) => ({
      id: `article-${article.id ?? article.slug}`,
      title: article.title,
      href: `/${locale}/article/${article.slug}`,
      typeLabel: article.categoryLabel ?? getDestinationLabel(locale, 'articlesAndGuides'),
      description: article.excerpt,
      meta: presentValues([
        article.regionName,
        article.countryName,
        article.readingTimeMinutes ? `${article.readingTimeMinutes} min` : null,
      ]).join(' · '),
      keywords: presentValues([
        article.category,
        article.categoryLabel,
        article.countryName,
        article.regionName,
        ...(article.badges ?? []),
      ]),
      priority: article.featured ? 8 : 5,
    })),
    ...countriesWithCounts.map((country) => ({
      id: `country-${country.id}`,
      title: country.name,
      href: `/${locale}/country/${country.id}`,
      typeLabel: getDestinationLabel(locale, 'countryGuide'),
      description: country.description,
      meta: presentValues([
        countMeta(country.articleCount, articlesCountLabel, locale),
        countMeta(country.regionCount, regionsCountLabel, locale),
      ]).join(' · '),
      keywords: presentValues([country.id, country.flag, country.name]),
      priority: country.articleCount > 0 ? 7 : 2,
    })),
    ...regionsWithCounts.map((region) => ({
      id: `region-${region.id}`,
      title: region.name,
      href: `/${locale}/region/${region.id}`,
      typeLabel: getDestinationLabel(locale, 'regionGuide'),
      description: region.description,
      meta: presentValues([
        region.countryName,
        countMeta(region.articleCount, articlesCountLabel, locale),
      ]).join(' · '),
      keywords: presentValues([region.countryName, region.language, region.name]),
      priority: region.articleCount > 0 ? 6 : 1,
    })),
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="relative z-20 bg-slate-950">
        <Image
          src={heroImage}
          alt={t('title')}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-90 dark:opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />

        <div className="relative mx-auto flex min-h-[54vh] max-w-6xl flex-col justify-end items-center px-4 pb-14 pt-20 md:min-h-[58vh] md:px-6 md:pt-24">
          <div className="max-w-4xl text-white flex flex-col items-center text-center">
            <p className="mb-4 inline-flex rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-emerald-400">
              {getDestinationLabel(locale, 'travelGuide')}
            </p>
            <h1 className="max-w-4xl break-words text-4xl font-black leading-tight tracking-tight md:text-6xl">
              {t('title')}
            </h1>
            <p className="mt-6 max-w-2xl break-words text-lg font-medium leading-relaxed text-white/90 md:text-xl">
              {t('subtitle')}
            </p>
            <div className="mt-8 w-full max-w-2xl mx-auto">
              <SmartSearch items={searchItems} locale={locale} />
            </div>
          </div>
        </div>
      </section>

      {articleCards.length > 0 && (
        <section id="articles" className="relative z-10 mx-auto -mt-8 max-w-6xl scroll-mt-24 px-4 pt-10 pb-10 md:px-6">
          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">
              {getDestinationLabel(locale, 'latestArticles')}
            </h2>
          </div>
          <HomeArticleExplorer
            locale={locale}
            articles={articleCards}
            categories={categories}
            defaultVisibleCount={latestArticlesLimit}
          />
          <div className="mt-8 flex justify-center">
            <a
              href={`/${locale}/articles`}
              className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-extrabold text-emerald-400 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-900/20"
            >
              {getDestinationLabel(locale, 'showAllArticles')}
            </a>
          </div>
        </section>
      )}

      <section
        id="countries"
        className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 md:px-6"
      >
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-500">
            {getDestinationLabel(locale, 'countries')}
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">
            {t('where_to')}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-400">
            {t('where_to_desc') || getDestinationLabel(locale, 'destinationsIntro')}
          </p>
        </div>

        {homepageCountries.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {homepageCountries.map((country) => (
                <DestinationCard
                  key={country.id}
                  href={`/${locale}/country/${country.id}`}
                  title={country.name}
                  description={country.description}
                  imageUrl={country.image_url}
                  imageAlt={country.name}
                  badge={getDestinationLabel(locale, 'countryGuide')}
                  flag={country.flag}
                  flagSrc={`/flags/${country.id.toLowerCase()}.svg`}
                  stats={[
                    {
                      label: getDestinationLabel(locale, 'articlesCount'),
                      value: country.articleCount,
                    },
                    {
                      label: getDestinationLabel(locale, 'regionsCount'),
                      value: country.regionCount,
                    },
                  ]}
                  actionLabel={getDestinationLabel(locale, 'exploreCountry')}
                />
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <a
                href={`/${locale}/countries`}
                className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-extrabold text-emerald-400 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-900/20"
              >
                {getDestinationLabel(locale, 'showAllCountries')}
              </a>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-8 text-center text-sm font-medium text-slate-400 shadow-sm">
            {t('no_countries')}
          </div>
        )}
      </section>

      {selectedRegions.length > 0 && (
        <section
          id="regions"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20 pt-8 md:px-6"
        >
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-500">
              {getDestinationLabel(locale, 'selectedRegions')}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
              {getDestinationLabel(locale, 'regions')}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {selectedRegions.map((region) => (
              <DestinationCard
                key={region.id}
                href={`/${locale}/region/${region.id}`}
                title={region.name}
                description={region.description}
                imageUrl={region.image_url}
                imageAlt={region.name}
                badge={getDestinationLabel(locale, 'regionGuide')}
                stats={[
                  {
                    label: getDestinationLabel(locale, 'articlesCount'),
                    value: region.articleCount,
                  },
                ]}
                actionLabel={getDestinationLabel(locale, 'exploreRegion')}
              />
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <a
              href={`/${locale}/regions`}
              className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-extrabold text-emerald-400 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-900/20"
            >
              {getDestinationLabel(locale, 'allRegions')}
            </a>
          </div>
        </section>
      )}
    </main>
  );
}
