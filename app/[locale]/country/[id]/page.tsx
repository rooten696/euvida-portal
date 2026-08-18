import CountryArticleExplorer from '@/app/components/country/CountryArticleExplorer';
import DestinationCard from '@/app/components/destination/DestinationCard';
import DestinationMarkdownSection from '@/app/components/destination/DestinationMarkdownSection';
import FavoriteButton from '@/app/components/FavoriteButton';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';
import SafeImage from '@/app/components/SafeImage';
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
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateStaticParams() {
  const { data: countries } = await supabase
    .from('countries')
    .select('id');

  if (!countries) return [];

  const params: { locale: string; id: string }[] = [];
  for (const locale of supportedLocales) {
    for (const country of countries) {
      if (country.id) {
        params.push({ locale, id: country.id });
      }
    }
  }
  return params;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://euvida.eu';
const articleSelect =
  'id, slug, title, excerpt, content, translations, image_url, image_alt, country_id, region_id, category, visit_info, published, featured, created_at, reading_time_minutes';

type CountryPageParams = {
  params: Promise<{ locale: string; id: string }>;
};

type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

type MarkdownSection = {
  title: string;
  content?: string | null;
  tone: 'blue' | 'green' | 'orange' | 'slate';
};

const countryMetadata: Record<
  SupportedLocale,
  {
    title: (countryName: string) => string;
    description: (countryName: string) => string;
    notFound: string;
  }
> = {
  cs: {
    title: (countryName) => `${countryName} – cestovní průvodce | Euvida`,
    description: (countryName) =>
      `Praktický cestovní průvodce pro ${countryName}: regiony, články a tipy na výlety po Evropě.`,
    notFound: 'Země nenalezena | Euvida',
  },
  en: {
    title: (countryName) => `${countryName} – travel guide | Euvida`,
    description: (countryName) =>
      `A practical travel guide to ${countryName}: regions, articles, and trip ideas across Europe.`,
    notFound: 'Country not found | Euvida',
  },
  de: {
    title: (countryName) => `${countryName} – Reiseführer | Euvida`,
    description: (countryName) =>
      `Praktischer Reiseführer für ${countryName}: Regionen, Artikel und Ideen für Ausflüge in Europa.`,
    notFound: 'Land nicht gefunden | Euvida',
  },
  fr: {
    title: (countryName) => `${countryName} – guide de voyage | Euvida`,
    description: (countryName) =>
      `Guide pratique pour ${countryName} : régions, articles et idées de sorties en Europe.`,
    notFound: 'Pays introuvable | Euvida',
  },
  es: {
    title: (countryName) => `${countryName} – guía de viaje | Euvida`,
    description: (countryName) =>
      `Guía práctica de ${countryName}: regiones, artículos e ideas para viajar por Europa.`,
    notFound: 'País no encontrado | Euvida',
  },
};

function incrementCount(map: Map<string, number>, key: string | null | undefined) {
  if (!key) {
    return;
  }

  map.set(key, (map.get(key) ?? 0) + 1);
}

function countBy<T>(
  items: T[],
  getKey: (item: T) => string | null | undefined
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    incrementCount(counts, getKey(item));
  }

  return counts;
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortArticles(articles: Article[]): Article[] {
  return [...articles].sort((left, right) => {
    const featuredOrder = Number(Boolean(right.featured)) - Number(Boolean(left.featured));

    if (featuredOrder !== 0) {
      return featuredOrder;
    }

    return toTimestamp(right.created_at) - toTimestamp(left.created_at);
  });
}

function categoryOptions(articles: Article[], locale: SupportedLocale): FilterOption[] {
  const counts = new Map<string, number>();

  for (const article of articles) {
    incrementCount(counts, article.category);
    if (article.category !== 'fkk' && article.visit_info?.nudist_beach === true) {
      incrementCount(counts, 'fkk');
    }
    if (
      (article.category === 'camping' || article.category === 'camp') &&
      (article.visit_info?.public_beach_access === true || article.visit_info?.public_swimming_access === true)
    ) {
      incrementCount(counts, 'natural_swimming');
    }
  }

  return [...counts.entries()]
    .map(([category, count]) => ({
      value: category,
      label: getArticleCategoryLabel(category, locale) ?? category,
      count,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, locale));
}

function hasMarkdownContent(
  section: MarkdownSection
): section is MarkdownSection & { content: string } {
  return Boolean(section.content?.trim());
}

export const revalidate = 604800;

export async function generateMetadata({
  params,
}: CountryPageParams): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = normalizeLocale(rawLocale);
  const copy = countryMetadata[locale];

  const { data: country } = await supabase
    .from('countries')
    .select('id, name, description, image_url, translations')
    .eq('id', id)
    .single();

  if (!country) {
    return { title: copy.notFound };
  }

  const displayCountry = getCountryDisplay(country as CountryDestination, locale);
  const title = copy.title(displayCountry.name);
  const description = displayCountry.description || copy.description(displayCountry.name);
  const canonical = `/${locale}/country/${displayCountry.id}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical,
      languages: Object.fromEntries(
        supportedLocales.map((supportedLocale) => [
          supportedLocale,
          `/${supportedLocale}/country/${displayCountry.id}`,
        ])
      ),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: displayCountry.image_url ? [{ url: displayCountry.image_url }] : undefined,
    },
  };
}

export default async function CountryPage({ params }: CountryPageParams) {
  const { locale: rawLocale, id } = await params;
  const locale = normalizeLocale(rawLocale);

  const [countryResult, regionsResult, articlesResult] = await Promise.all([
    supabase.from('countries').select('*').eq('id', id).single(),
    supabase
      .from('regions')
      .select('id, country_id, name, language, description, image_url, translations')
      .eq('country_id', id)
      .order('name'),
    supabase
      .from('articles')
      .select(articleSelect)
      .eq('published', true)
      .eq('country_id', id),
  ]);

  if (!countryResult.data) {
    notFound();
  }

  if (regionsResult.error) {
    console.error('Chyba při načítání regionů:', regionsResult.error);
  }

  if (articlesResult.error) {
    console.error('Chyba při načítání článků:', articlesResult.error);
  }

  const displayCountry = getCountryDisplay(
    countryResult.data as CountryDestination,
    locale
  );
  const rawRegions = (regionsResult.data ?? []) as RegionDestination[];
  const articles = sortArticles((articlesResult.data ?? []) as Article[]);
  const articleCountByRegion = countBy(articles, (article) => article.region_id);

  const regions = rawRegions
    .map((region) => ({
      ...getRegionDisplay(region, locale),
      articleCount: articleCountByRegion.get(region.id) ?? 0,
    }))
    .sort((left, right) => {
      if (right.articleCount !== left.articleCount) {
        return right.articleCount - left.articleCount;
      }

      return left.name.localeCompare(right.name, locale);
    });

  const regionNameById = new Map(regions.map((region) => [region.id, region.name]));
  const articleCards: ArticleCardData[] = articles.map((article) =>
    toArticleCardData(article, locale, {
      countryName: displayCountry.name,
      regionName: article.region_id ? regionNameById.get(article.region_id) : null,
    })
  );
  const categories = categoryOptions(articles, locale);
  const articleCount = articleCards.length;
  const regionCount = regions.length;
  const countrySectionCandidates: MarkdownSection[] = [
    {
      title: getDestinationLabel(locale, 'generalInfo'),
      content: displayCountry.general_info,
      tone: 'slate',
    },
    {
      title: getDestinationLabel(locale, 'travelTourism'),
      content: displayCountry.travel_tourism,
      tone: 'green',
    },
    {
      title: getDestinationLabel(locale, 'lifeWork'),
      content: displayCountry.life_work,
      tone: 'blue',
    },
    {
      title: getDestinationLabel(locale, 'cultureFood'),
      content: displayCountry.culture_food,
      tone: 'orange',
    },
    {
      title: getDestinationLabel(locale, 'practicalCautions'),
      content: displayCountry.practical_cautions,
      tone: 'slate',
    },
  ];
  const countrySections = countrySectionCandidates.filter(hasMarkdownContent);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="relative overflow-hidden bg-slate-950">
        {displayCountry.image_url ? (
          <SafeImage
            src={displayCountry.image_url}
            alt={displayCountry.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
            fallbackClassName=""
            fallbackLabel={displayCountry.name}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />

        <div className="relative mx-auto flex min-h-[58vh] max-w-6xl flex-col px-4 pb-12 pt-8 md:px-6 md:pb-16">
          <div className="flex items-start justify-between gap-4">
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-2 text-sm font-bold text-white/80"
            >
              <Link href={`/${locale}`} className="transition hover:text-white">
                {getDestinationLabel(locale, 'home')}
              </Link>
              <span aria-hidden="true">/</span>
              <Link href={`/${locale}#countries`} className="transition hover:text-white">
                {getDestinationLabel(locale, 'countries')}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-white">{displayCountry.name}</span>
            </nav>

            <div className="flex shrink-0 flex-col items-end gap-3 sm:flex-row sm:items-center">
              <FavoriteButton countryId={displayCountry.id} locale={locale} />
            </div>
          </div>

          <div className="mt-auto max-w-4xl pt-20 text-white">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <p className="inline-flex rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-emerald-400">
                {getDestinationLabel(locale, 'countryGuide')}
              </p>
              {displayCountry.flag && (
                <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xl shadow-sm backdrop-blur">
                  {displayCountry.flag}
                </span>
              )}
            </div>
            <h1 className="break-words text-4xl font-black leading-tight tracking-tight md:text-6xl">
              {displayCountry.name}
            </h1>
            {displayCountry.description && (
              <p className="mt-6 max-w-3xl break-words text-lg font-medium leading-relaxed text-white/90 md:text-xl">
                {displayCountry.description}
              </p>
            )}

            <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-white shadow-xl backdrop-blur">
                <dt className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  {getDestinationLabel(locale, 'regionsCount')}
                </dt>
                <dd className="mt-1 text-3xl font-black">{regionCount}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-white shadow-xl backdrop-blur">
                <dt className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  {getDestinationLabel(locale, 'articlesCount')}
                </dt>
                <dd className="mt-1 text-3xl font-black">{articleCount}</dd>
              </div>
              <div className="col-span-2 rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-white shadow-xl backdrop-blur sm:col-span-1">
                <dt className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  {getDestinationLabel(locale, 'articleCategories')}
                </dt>
                <dd className="mt-1 text-3xl font-black">{categories.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        {articleCards.length > 0 && (
          <section
            id="articles"
            className={countrySections.length > 0 || regions.length > 0 ? 'mb-16' : undefined}
          >
            <div className="mb-6">
              <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                {getDestinationLabel(locale, 'countryArticles')}
              </h2>
            </div>

            <CountryArticleExplorer
              locale={locale}
              articles={articleCards}
              categories={categories}
            />
          </section>
        )}

        {countrySections.length > 0 && (
          <section
            id="country-info"
            className={regions.length > 0 ? 'mb-16 grid grid-cols-1 gap-5 md:grid-cols-2' : 'grid grid-cols-1 gap-5 md:grid-cols-2'}
          >
            {countrySections.map((section) => (
              <DestinationMarkdownSection
                key={section.title}
                title={section.title}
                content={section.content}
                tone={section.tone}
              />
            ))}
          </section>
        )}

        {regions.length > 0 && (
          <section id="regions">
            <div className="mb-6">
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-400">
                {getDestinationLabel(locale, 'routes')}
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
                {getDestinationLabel(locale, 'regions')}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {regions.map((region) => (
                <DestinationCard
                  key={region.id}
                  href={`/${locale}/region/${region.id}`}
                  title={region.name}
                  description={region.description}
                  imageUrl={region.image_url}
                  imageAlt={region.name}
                  badge={
                    region.language
                      ? `${getDestinationLabel(locale, 'language')}: ${region.language}`
                      : getDestinationLabel(locale, 'regionGuide')
                  }
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

        {articleCards.length === 0 && countrySections.length === 0 && (
          <section id="articles">
            <div className="mb-6">
              <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                {getDestinationLabel(locale, 'countryArticles')}
              </h2>
            </div>

            <CountryArticleExplorer
              locale={locale}
              articles={articleCards}
              categories={categories}
            />
          </section>
        )}
      </div>
    </main>
  );
}
