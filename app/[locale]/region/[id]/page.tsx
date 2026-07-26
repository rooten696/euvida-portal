import DestinationMarkdownSection from '@/app/components/destination/DestinationMarkdownSection';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';
import FavoriteButton from '@/app/components/FavoriteButton';
import RegionArticleExplorer from '@/app/components/region/RegionArticleExplorer';
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
  type WeatherData,
  getCountryDisplay,
  getRegionDisplay,
  hasTemperature,
} from '@/lib/destinationTypes';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateStaticParams() {
  const { data: regions } = await supabase
    .from('regions')
    .select('id');

  if (!regions) return [];

  const params: { locale: string; id: string }[] = [];
  for (const locale of supportedLocales) {
    for (const region of regions) {
      if (region.id) {
        params.push({ locale, id: region.id });
      }
    }
  }
  return params;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://euvida.eu';
const articleSelect =
  'id, slug, title, excerpt, content, translations, image_url, image_alt, country_id, region_id, category, published, featured, created_at, reading_time_minutes';

type RegionPageParams = {
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

type SeasonTemperature = {
  label: string;
  air?: string | null;
  sea?: string | null;
  featured?: boolean;
};

const regionMetadata: Record<
  SupportedLocale,
  {
    title: (regionName: string, countryName?: string | null) => string;
    description: (regionName: string, countryName?: string | null) => string;
    notFound: string;
  }
> = {
  cs: {
    title: (regionName, countryName) =>
      countryName
        ? `${regionName}, ${countryName} – cestovní průvodce | Euvida`
        : `${regionName} – cestovní průvodce | Euvida`,
    description: (regionName, countryName) =>
      countryName
        ? `Praktický průvodce regionem ${regionName} v zemi ${countryName}: články, témata a tipy na výlety.`
        : `Praktický průvodce regionem ${regionName}: články, témata a tipy na výlety.`,
    notFound: 'Region nenalezen | Euvida',
  },
  en: {
    title: (regionName, countryName) =>
      countryName
        ? `${regionName}, ${countryName} – travel guide | Euvida`
        : `${regionName} – travel guide | Euvida`,
    description: (regionName, countryName) =>
      countryName
        ? `A practical guide to ${regionName} in ${countryName}: articles, topics, and trip ideas.`
        : `A practical guide to ${regionName}: articles, topics, and trip ideas.`,
    notFound: 'Region not found | Euvida',
  },
  de: {
    title: (regionName, countryName) =>
      countryName
        ? `${regionName}, ${countryName} – Reiseführer | Euvida`
        : `${regionName} – Reiseführer | Euvida`,
    description: (regionName, countryName) =>
      countryName
        ? `Praktischer Reiseführer für ${regionName} in ${countryName}: Artikel, Themen und Ausflugsideen.`
        : `Praktischer Reiseführer für ${regionName}: Artikel, Themen und Ausflugsideen.`,
    notFound: 'Region nicht gefunden | Euvida',
  },
  fr: {
    title: (regionName, countryName) =>
      countryName
        ? `${regionName}, ${countryName} – guide de voyage | Euvida`
        : `${regionName} – guide de voyage | Euvida`,
    description: (regionName, countryName) =>
      countryName
        ? `Guide pratique de ${regionName} en ${countryName} : articles, thèmes et idées de sorties.`
        : `Guide pratique de ${regionName} : articles, thèmes et idées de sorties.`,
    notFound: 'Région introuvable | Euvida',
  },
  es: {
    title: (regionName, countryName) =>
      countryName
        ? `${regionName}, ${countryName} – guía de viaje | Euvida`
        : `${regionName} – guía de viaje | Euvida`,
    description: (regionName, countryName) =>
      countryName
        ? `Guía práctica de ${regionName} en ${countryName}: artículos, temas e ideas para viajar.`
        : `Guía práctica de ${regionName}: artículos, temas e ideas para viajar.`,
    notFound: 'Región no encontrada | Euvida',
  },
};

export const revalidate = 86400;

function hasSeasonData(seasons: SeasonTemperature[]): boolean {
  return seasons.some((season) => hasTemperature(season.air) || hasTemperature(season.sea));
}

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
  const counts = countBy(articles, (article) => article.category);

  return [...counts.entries()]
    .map(([category, count]) => ({
      value: category,
      label: getArticleCategoryLabel(category, locale) ?? category,
      count,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, locale));
}

async function getWeatherData(
  locationName: string,
  locale: string
): Promise<WeatherData | null> {
  const weatherApiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY;

  if (!weatherApiKey || !locationName) {
    return null;
  }

  // Helper to extract a clean city/region name
  // E.g. "Řím, Lazio a střední Itálie" -> "Řím"
  const extractPrimaryName = (name: string) => {
    let clean = name.split(',')[0].split(':')[0].trim();
    if (clean.includes(' a ')) clean = clean.split(' a ')[0];
    if (clean.includes(' and ')) clean = clean.split(' and ')[0];
    return clean.replace(/\b(Region|Province|County|Kraj|State)\b/ig, '').trim();
  };

  // Map known region names (English or Czech) to their capital cities for OpenWeatherMap
  const REGION_CITY_MAP: Record<string, string> = {
    'South Bohemian Region': 'Ceske Budejovice',
    'South Moravian Region': 'Brno',
    'Central Bohemian Region': 'Prague',
    'Plzeň Region': 'Plzen',
    'Karlovy Vary Region': 'Karlovy Vary',
    'Ústí nad Labem Region': 'Usti nad Labem',
    'Liberec Region': 'Liberec',
    'Hradec Králové Region': 'Hradec Kralove',
    'Pardubice Region': 'Pardubice',
    'Vysočina Region': 'Jihlava',
    'Olomouc Region': 'Olomouc',
    'Zlín Region': 'Zlin',
    'Moravian-Silesian Region': 'Ostrava',
    'Jihočeský kraj': 'Ceske Budejovice',
    'Jihomoravský kraj': 'Brno',
    'Středočeský kraj': 'Prague',
    'Plzeňský kraj': 'Plzen',
    'Karlovarský kraj': 'Karlovy Vary',
    'Ústecký kraj': 'Usti nad Labem',
    'Liberecký kraj': 'Liberec',
    'Královéhradecký kraj': 'Hradec Kralove',
    'Pardubický kraj': 'Pardubice',
    'Kraj Vysočina': 'Jihlava',
    'Olomoucký kraj': 'Olomouc',
    'Zlínský kraj': 'Zlin',
    'Moravskoslezský kraj': 'Ostrava',
    'Apulie, Basilicata a Kalábrie': 'Bari',
    'Apulia, Basilicata and Calabria': 'Bari',
    'Řím, Lazio a střední Itálie': 'Rome',
    'Rome, Lazio and Central Italy': 'Rome',
    'Toskánsko, Florencie a Umbrie': 'Florence',
    'Tuscany, Florence and Umbria': 'Florence',
    'Milán, jezera a Lombardie': 'Milan',
    'Milan, the lakes and Lombardy': 'Milan',
    'Benátsko, Verona a Dolomity': 'Venice',
    'Veneto, Verona and the Dolomites': 'Venice',
    'Neapol, Kampánie a pobřeží Amalfi': 'Naples',
    'Naples, Campania and Amalfi Coast': 'Naples',
    'Sicílie': 'Palermo',
    'Sicily': 'Palermo',
    'Sardinie': 'Cagliari',
    'Sardinia': 'Cagliari',
    'Athény, Attika a Saronské ostrovy': 'Athens',
    'Kréta': 'Heraklion',
    'Peloponés': 'Patras',
    'Salcbursko, Salzkammergut a Hallstatt': 'Salzburg',
    'Salzburg, Salzkammergut and Hallstatt': 'Salzburg'
  };

  let queryName = REGION_CITY_MAP[locationName];
  if (!queryName) {
    queryName = extractPrimaryName(locationName);
  }

  try {
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        queryName
      )}&appid=${weatherApiKey}&units=metric&lang=${locale}`,
      { next: { revalidate: 86400 } }
    );

    if (!weatherRes.ok) {
      return null;
    }

    return (await weatherRes.json()) as WeatherData;
  } catch (error) {
    console.error('Chyba při načítání počasí:', error);
    return null;
  }
}

async function getRegionAndCountry(id: string, locale: SupportedLocale) {
  const { data: region } = await supabase
    .from('regions')
    .select('*')
    .eq('id', id)
    .single();

  if (!region) {
    return { region: null, country: null };
  }

  const displayRegion = getRegionDisplay(region as RegionDestination, locale);
  const { data: country } = await supabase
    .from('countries')
    .select('id, name, flag, translations')
    .eq('id', displayRegion.country_id)
    .single();

  return {
    region: displayRegion,
    country: country ? getCountryDisplay(country as CountryDestination, locale) : null,
  };
}

export async function generateMetadata({
  params,
}: RegionPageParams): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = normalizeLocale(rawLocale);
  const copy = regionMetadata[locale];
  const { region, country } = await getRegionAndCountry(id, locale);

  if (!region) {
    return { title: copy.notFound };
  }

  const title = copy.title(region.name, country?.name);
  const description = region.description || copy.description(region.name, country?.name);
  const canonical = `/${locale}/region/${region.id}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical,
      languages: Object.fromEntries(
        supportedLocales.map((supportedLocale) => [
          supportedLocale,
          `/${supportedLocale}/region/${region.id}`,
        ])
      ),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: region.image_url ? [{ url: region.image_url }] : undefined,
    },
  };
}

export default async function RegionPage({ params }: RegionPageParams) {
  const { locale: rawLocale, id } = await params;
  const locale = normalizeLocale(rawLocale);
  const { region: displayRegion, country: displayCountry } = await getRegionAndCountry(
    id,
    locale
  );

  if (!displayRegion) {
    notFound();
  }

  const { data: articleRows, error: articlesError } = await supabase
    .from('articles')
    .select(articleSelect)
    .eq('published', true)
    .eq('region_id', id);

  if (articlesError) {
    console.error('Chyba při načítání článků:', articlesError);
  }

  const articles = sortArticles((articleRows ?? []) as Article[]);
  const articleCards: ArticleCardData[] = articles.map((article) =>
    toArticleCardData(article, locale, {
      countryName: displayCountry?.name,
      regionName: displayRegion.name,
    })
  );
  const categories = categoryOptions(articles, locale);
  const countryHref = `/${locale}/country/${displayRegion.country_id}`;

  const weatherData = await getWeatherData(displayRegion.name, locale);
  const weather = weatherData?.weather?.[0];
  const temperature =
    typeof weatherData?.main?.temp === 'number' ? weatherData.main.temp : null;
  const temperatureFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  });

  const seasons: SeasonTemperature[] = [
    {
      label: getDestinationLabel(locale, 'spring'),
      air: displayRegion.temp_spring_air,
      sea: displayRegion.temp_spring_sea,
    },
    {
      label: getDestinationLabel(locale, 'summer'),
      air: displayRegion.temp_summer_air,
      sea: displayRegion.temp_summer_sea,
      featured: true,
    },
    {
      label: getDestinationLabel(locale, 'autumn'),
      air: displayRegion.temp_autumn_air,
      sea: displayRegion.temp_autumn_sea,
    },
    {
      label: getDestinationLabel(locale, 'winter'),
      air: displayRegion.temp_winter_air,
      sea: displayRegion.temp_winter_sea,
    },
  ];

  const sections: MarkdownSection[] = [
    {
      title: getDestinationLabel(locale, 'generalInfo'),
      content: displayRegion.general_info,
      tone: 'slate',
    },
    {
      title: getDestinationLabel(locale, 'natureAndTrips'),
      content: displayRegion.nature_and_landscapes,
      tone: 'green',
    },
    {
      title: getDestinationLabel(locale, 'historyAtmosphere'),
      content: displayRegion.history_and_culture,
      tone: 'orange',
    },
    {
      title: getDestinationLabel(locale, 'transportAndLife'),
      content: displayRegion.transport_and_life,
      tone: 'blue',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="relative overflow-hidden bg-slate-950">
        {displayRegion.image_url ? (
          <SafeImage
            src={displayRegion.image_url}
            alt={displayRegion.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
            fallbackClassName=""
            fallbackLabel={displayRegion.name}
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
              {displayCountry && (
                <>
                  <span aria-hidden="true">/</span>
                  <Link href={countryHref} className="transition hover:text-white">
                    {displayCountry.name}
                  </Link>
                </>
              )}
              <span aria-hidden="true">/</span>
              <span className="text-white">{displayRegion.name}</span>
            </nav>
          </div>

          <div className="mt-auto max-w-4xl pt-20 text-white">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <p className="inline-flex rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-emerald-400">
                {getDestinationLabel(locale, 'regionGuide')}
              </p>
              {displayCountry?.flag && (
                <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xl shadow-sm backdrop-blur">
                  {displayCountry.flag}
                </span>
              )}
            </div>
            <h1 className="break-words text-4xl font-black leading-tight tracking-tight md:text-6xl">
              {displayRegion.name}
            </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {displayCountry && (
                  <Link
                    href={countryHref}
                    className="inline-flex rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm font-extrabold text-slate-300 shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
                  >
                    {getDestinationLabel(locale, 'backToCountry')}: {displayCountry.name}
                  </Link>
                )}
                <FavoriteButton regionId={displayRegion.id} locale={locale} />
              </div>
            {displayRegion.description && (
              <p className="mt-6 max-w-3xl break-words text-lg font-medium leading-relaxed text-white/90 md:text-xl">
                {displayRegion.description}
              </p>
            )}

            <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-white shadow-xl backdrop-blur">
                <dt className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  {getDestinationLabel(locale, 'articlesCount')}
                </dt>
                <dd className="mt-1 text-3xl font-black">{articleCards.length}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-white shadow-xl backdrop-blur">
                <dt className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  {getDestinationLabel(locale, 'articleCategories')}
                </dt>
                <dd className="mt-1 text-3xl font-black">{categories.length}</dd>
              </div>
              {displayCountry && (
                <div className="col-span-2 rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-white shadow-xl backdrop-blur sm:col-span-1">
                  <dt className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                    {getDestinationLabel(locale, 'countries')}
                  </dt>
                  <dd className="mt-1 text-xl font-black">{displayCountry.name}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        {articleCards.length > 0 && (
          <section id="articles" className="mb-16">
            <div className="mb-6">
              <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                {getDestinationLabel(locale, 'regionArticles')}
              </h2>
            </div>

            <RegionArticleExplorer
              locale={locale}
              articles={articleCards}
              categories={categories}
              countryHref={countryHref}
              countryName={displayCountry?.name}
            />
          </section>
        )}

        {(weather || hasSeasonData(seasons)) && (
          <section className="mb-12 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-sm backdrop-blur md:p-8">
            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-emerald-400">
                  {getDestinationLabel(locale, 'currentWeather')}
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                  {getDestinationLabel(locale, 'averageTemperatures')}
                </h2>
              </div>
              {displayRegion.language && (
                <span className="w-fit rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-300">
                  {getDestinationLabel(locale, 'language')}: {displayRegion.language}
                </span>
              )}
            </div>

            <div className={`grid gap-6 ${weather ? 'lg:grid-cols-[240px_minmax(0,1fr)]' : 'grid-cols-1'}`}>
              {weather && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-950/30 p-5 text-center">
                  {weather.icon && (
                     <Image
                      src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                      alt={weather.description || getDestinationLabel(locale, 'currentWeather')}
                      width={96}
                      height={96}
                      className="mx-auto -mb-2 h-24 w-24"
                    />
                  )}
                  {temperature !== null && (
                    <div className="text-4xl font-black text-blue-100">
                      {temperatureFormatter.format(temperature)} °C
                    </div>
                  )}
                  {weather.description && (
                    <div className="mt-2 text-sm font-bold capitalize text-blue-300">
                      {weather.description}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {seasons.map((season) => (
                  <div
                    key={season.label}
                    className={`rounded-2xl border p-4 ${
                      season.featured
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-white/10 bg-slate-800/50'
                    }`}
                  >
                    <h3 className="font-extrabold text-white">{season.label}</h3>
                    <div className="mt-3 space-y-2 text-sm text-slate-300">
                      {hasTemperature(season.air) && (
                        <div className="flex items-center justify-between gap-3">
                          <span>{getDestinationLabel(locale, 'air')}</span>
                          <strong className="text-white">{season.air} °C</strong>
                        </div>
                      )}
                      {hasTemperature(season.sea) && (
                        <div className="flex items-center justify-between gap-3">
                          <span>{getDestinationLabel(locale, 'sea')}</span>
                          <strong className="text-emerald-300">{season.sea} °C</strong>
                        </div>
                      )}
                      {!hasTemperature(season.air) && !hasTemperature(season.sea) && (
                        <div className="text-xs font-medium text-slate-500">
                          {getDestinationLabel(locale, 'noData')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <DestinationMarkdownSection
              key={section.title}
              title={section.title}
              content={section.content}
              tone={section.tone}
            />
          ))}
        </section>
      </div>
    </main>
  );
}
