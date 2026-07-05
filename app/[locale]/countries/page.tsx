import DestinationCard from '@/app/components/destination/DestinationCard';
import { normalizeLocale } from '@/lib/articleLocalization';
import type { SupportedLocale } from '@/lib/articleTypes';
import { supportedLocales } from '@/lib/articleTypes';
import { getDestinationLabel } from '@/lib/destinationLabels';
import {
  type CountryDestination,
  type RegionDestination,
  getCountryDisplay,
} from '@/lib/destinationTypes';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://euvida.eu';

type CountriesPageProps = {
  params: Promise<{ locale: string }>;
};

type ArticleCountRow = {
  country_id?: string | null;
};

type CountMap = Map<string, number>;

const countriesMetadata: Record<SupportedLocale, { title: string; description: string }> = {
  cs: {
    title: 'Všechny země | Euvida',
    description: 'Přehled evropských zemí na Euvidě s odkazy na regiony a praktické články.',
  },
  en: {
    title: 'All countries | Euvida',
    description: 'Browse European countries on Euvida with links to regions and practical guides.',
  },
  de: {
    title: 'Alle Länder | Euvida',
    description: 'Europäische Länder auf Euvida mit Links zu Regionen und praktischen Artikeln.',
  },
  fr: {
    title: 'Tous les pays | Euvida',
    description: 'Parcourez les pays européens sur Euvida avec leurs régions et guides pratiques.',
  },
  es: {
    title: 'Todos los países | Euvida',
    description: 'Explora países europeos en Euvida con enlaces a regiones y guías prácticas.',
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

export const revalidate = 3600;

export async function generateMetadata({ params }: CountriesPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const meta = countriesMetadata[locale];

  return {
    metadataBase: new URL(siteUrl),
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/countries`,
      languages: Object.fromEntries(
        supportedLocales.map((supportedLocale) => [
          supportedLocale,
          `/${supportedLocale}/countries`,
        ])
      ),
    },
  };
}

export default async function CountriesPage({ params }: CountriesPageProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);

  const [countriesResult, regionsResult, articlesResult] = await Promise.all([
    supabase
      .from('countries')
      .select('id, name, flag, description, image_url, translations')
      .order('name'),
    supabase.from('regions').select('id, country_id'),
    supabase.from('articles').select('country_id').eq('published', true),
  ]);

  if (countriesResult.error) {
    console.error('Chyba při načítání zemí:', countriesResult.error);
  }

  if (regionsResult.error) {
    console.error('Chyba při načítání regionů:', regionsResult.error);
  }

  if (articlesResult.error) {
    console.error('Chyba při načítání článků:', articlesResult.error);
  }

  const countries = ((countriesResult.data ?? []) as CountryDestination[]).map((country) =>
    getCountryDisplay(country, locale)
  );
  const regions = (regionsResult.data ?? []) as Pick<RegionDestination, 'id' | 'country_id'>[];
  const articles = (articlesResult.data ?? []) as ArticleCountRow[];
  const articleCountByCountry = countBy(articles, (article) => article.country_id);
  const regionCountByCountry = countBy(regions, (region) => region.country_id);
  const displayCountries = countries
    .map((country) => ({
      ...country,
      articleCount: articleCountByCountry.get(country.id) ?? 0,
      regionCount: regionCountByCountry.get(country.id) ?? 0,
    }))
    .sort((left, right) => {
      if (right.articleCount !== left.articleCount) {
        return right.articleCount - left.articleCount;
      }

      if (right.regionCount !== left.regionCount) {
        return right.regionCount - left.regionCount;
      }

      return left.name.localeCompare(right.name, locale);
    });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <nav className="mb-8 text-sm font-bold text-emerald-400">
          <Link href={`/${locale}`} className="hover:text-emerald-300">
            {getDestinationLabel(locale, 'home')}
          </Link>
          <span className="mx-2 text-slate-400">/</span>
          <span className="text-slate-400">{getDestinationLabel(locale, 'allCountries')}</span>
        </nav>

        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-500">
            {getDestinationLabel(locale, 'destinations')}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-6xl">
            {getDestinationLabel(locale, 'allCountries')}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            {getDestinationLabel(locale, 'destinationsIntro')}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
        {displayCountries.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayCountries.map((country) => (
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
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 text-center text-sm font-medium text-slate-400 shadow-sm backdrop-blur">
            {getDestinationLabel(locale, 'noData')}
          </div>
        )}
      </section>
    </main>
  );
}
