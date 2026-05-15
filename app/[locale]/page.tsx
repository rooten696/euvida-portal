import ArticleCard from '@/app/components/article/ArticleCard';
import DestinationCard from '@/app/components/destination/DestinationCard';
import HomeArticleExplorer from '@/app/components/home/HomeArticleExplorer';
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
      label: `${getArticleCategoryLabel(category, locale) ?? category} (${count})`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, locale));
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

  const [articlesResult, countriesResult, regionsResult] = await Promise.all([
    supabase
      .from('articles')
      .select(
        'id, slug, title, excerpt, content, translations, image_url, image_alt, country_id, region_id, category, published, featured, created_at, reading_time_minutes, visit_info, prices_info, access_info'
      )
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
  const featuredArticles = articleCards.filter((article) => article.featured).slice(0, 6);
  const latestArticles = articleCards.slice(0, 24);
  const categories = categoryOptions(articles, locale);
  const countryFilterOptions = countries
    .filter((country) => (articleCountByCountry.get(country.id) ?? 0) > 0)
    .map((country) => ({
      value: country.id,
      label: country.name,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, locale));
  const selectedRegions = regions
    .map((region) => ({
      ...region,
      articleCount: articleCountByRegion.get(region.id) ?? 0,
    }))
    .sort((left, right) => {
      if (right.articleCount !== left.articleCount) {
        return right.articleCount - left.articleCount;
      }

      return left.name.localeCompare(right.name, locale);
    })
    .slice(0, 8);

  const features = [
    {
      eyebrow: '01',
      title: t('feature1_title'),
      description: t('feature1_desc'),
    },
    {
      eyebrow: '02',
      title: t('feature2_title'),
      description: t('feature2_desc'),
    },
    {
      eyebrow: '03',
      title: t('feature3_title'),
      description: t('feature3_desc'),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-slate-950">
        <Image
          src={heroImage}
          alt={t('title')}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-950/45 to-slate-950/20" />

        <div className="relative mx-auto flex min-h-[68vh] max-w-6xl flex-col justify-end px-4 pb-20 pt-32 md:px-6">
          <div className="max-w-4xl text-white">
            <p className="mb-4 inline-flex rounded-full bg-yellow-300 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-yellow-950">
              {getDestinationLabel(locale, 'travelGuide')}
            </p>
            <h1 className="max-w-4xl break-words text-4xl font-black leading-tight tracking-tight md:text-6xl">
              {t('title')}
            </h1>
            <p className="mt-6 max-w-2xl break-words text-lg font-medium leading-relaxed text-white/90 md:text-xl">
              {t('subtitle')}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#featured"
                className="inline-flex rounded-full bg-yellow-300 px-6 py-3 text-sm font-extrabold text-yellow-950 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-yellow-200"
              >
                {getDestinationLabel(locale, 'articlesAndGuides')}
              </a>
              <a
                href="#countries"
                className="inline-flex rounded-full bg-white/90 px-6 py-3 text-sm font-extrabold text-blue-950 shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-white"
              >
                {getDestinationLabel(locale, 'countries')}
              </a>
              <a
                href="#regions"
                className="inline-flex rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                {getDestinationLabel(locale, 'regions')}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-14 max-w-6xl px-4 md:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.eyebrow}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-950/5"
            >
              <span className="text-xs font-black uppercase tracking-wide text-blue-700">
                {feature.eyebrow}
              </span>
              <h2 className="mt-3 text-xl font-extrabold text-slate-950">
                {feature.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {featuredArticles.length > 0 && (
        <section id="featured" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:px-6">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              {getDestinationLabel(locale, 'featuredArticles')}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              {getDestinationLabel(locale, 'articlesAndGuides')}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredArticles.map((article, index) => (
              <ArticleCard
                key={article.slug}
                article={article}
                locale={locale}
                priority={index < 3}
              />
            ))}
          </div>
        </section>
      )}

      <section id="articles" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10 md:px-6">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
            {getDestinationLabel(locale, 'latestArticles')}
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            {getDestinationLabel(locale, 'latestGuides')}
          </h2>
        </div>
        <HomeArticleExplorer
          locale={locale}
          articles={latestArticles}
          categories={categories}
          countries={countryFilterOptions}
        />
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <div className="mb-6">
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              {getDestinationLabel(locale, 'articleCategories')}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              {getDestinationLabel(locale, 'quickChoices')}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <a
                key={category.value}
                href="#articles"
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/5"
              >
                <span className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  {getDestinationLabel(locale, 'categoryCount')}
                </span>
                <h3 className="mt-2 text-lg font-extrabold text-slate-950">
                  {category.label}
                </h3>
              </a>
            ))}
          </div>
        </section>
      )}

      <section
        id="countries"
        className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 md:px-6"
      >
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
            {getDestinationLabel(locale, 'countries')}
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
            {t('where_to')}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            {t('where_to_desc') || getDestinationLabel(locale, 'destinationsIntro')}
          </p>
        </div>

        {countries.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((country) => (
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
                    value: articleCountByCountry.get(country.id) ?? 0,
                  },
                  {
                    label: getDestinationLabel(locale, 'regionsCount'),
                    value: regionCountByCountry.get(country.id) ?? 0,
                  },
                ]}
                actionLabel={getDestinationLabel(locale, 'exploreCountry')}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-sm">
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
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              {getDestinationLabel(locale, 'selectedRegions')}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
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
        </section>
      )}
    </main>
  );
}
