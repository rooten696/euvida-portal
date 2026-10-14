import RegionBatchExplorer from '@/app/components/destination/RegionBatchExplorer';
import { normalizeLocale } from '@/lib/articleLocalization';
import type { SupportedLocale } from '@/lib/articleTypes';
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

import { canonicalMetadataBase } from '@/lib/siteConfig';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type RegionsPageProps = {
  params: Promise<{ locale: string }>;
};

type ArticleCountRow = {
  region_id?: string | null;
};

type CountMap = Map<string, number>;

const regionsMetadata: Record<SupportedLocale, { title: string; description: string }> = {
  cs: {
    title: 'Všechny regiony | Euvida',
    description: 'Přehled evropských regionů na Euvidě s praktickými cestovatelskými články.',
  },
  en: {
    title: 'All regions | Euvida',
    description: 'Browse European regions on Euvida with practical travel articles.',
  },
  de: {
    title: 'Alle Regionen | Euvida',
    description: 'Europäische Regionen auf Euvida mit praktischen Reiseartikeln.',
  },
  fr: {
    title: 'Toutes les régions | Euvida',
    description: 'Parcourez les régions européennes sur Euvida avec des guides pratiques.',
  },
  es: {
    title: 'Todas las regiones | Euvida',
    description: 'Explora regiones europeas en Euvida con guías prácticas de viaje.',
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

export const revalidate = 86400;

export async function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: RegionsPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const meta = regionsMetadata[locale];

  return {
    metadataBase: canonicalMetadataBase,
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/regions`,
      languages: Object.fromEntries(
        supportedLocales.map((supportedLocale) => [
          supportedLocale,
          `/${supportedLocale}/regions`,
        ])
      ),
    },
  };
}

export default async function RegionsPage({ params }: RegionsPageProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);

  const [regionsResult, countriesResult, articlesResult] = await Promise.all([
    supabase
      .from('regions')
      .select('id, country_id, name, language, description, image_url, translations')
      .order('name'),
    supabase
      .from('countries')
      .select('id, name, flag, description, image_url, translations')
      .order('name'),
    supabase.from('articles').select('region_id').eq('published', true),
  ]);

  if (regionsResult.error) {
    console.error('Chyba při načítání regionů:', regionsResult.error);
  }

  if (countriesResult.error) {
    console.error('Chyba při načítání zemí:', countriesResult.error);
  }

  if (articlesResult.error) {
    console.error('Chyba při načítání článků:', articlesResult.error);
  }

  const countries = ((countriesResult.data ?? []) as CountryDestination[]).map((country) =>
    getCountryDisplay(country, locale)
  );
  const regions = ((regionsResult.data ?? []) as RegionDestination[]).map((region) =>
    getRegionDisplay(region, locale)
  );
  const articles = (articlesResult.data ?? []) as ArticleCountRow[];
  const articleCountByRegion = countBy(articles, (article) => article.region_id);
  const countryNameById = new Map(countries.map((country) => [country.id, country.name]));
  const displayRegions = regions
    .map((region) => ({
      ...region,
      articleCount: articleCountByRegion.get(region.id) ?? 0,
      countryName: countryNameById.get(region.country_id) ?? null,
    }))
    .sort((left, right) => {
      if (right.articleCount !== left.articleCount) {
        return right.articleCount - left.articleCount;
      }

      const countryOrder = (left.countryName ?? '').localeCompare(
        right.countryName ?? '',
        locale
      );

      if (countryOrder !== 0) {
        return countryOrder;
      }

      return left.name.localeCompare(right.name, locale);
    });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <nav className="mb-8 text-sm font-bold text-slate-400">
          <Link href={`/${locale}`} className="hover:text-emerald-500 transition-colors">
            {getDestinationLabel(locale, 'home')}
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-slate-300">{getDestinationLabel(locale, 'allRegions')}</span>
        </nav>

        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-500">
            {getDestinationLabel(locale, 'routes')}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-6xl">
            {getDestinationLabel(locale, 'allRegions')}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            {getDestinationLabel(locale, 'destinationsIntro')}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
        <RegionBatchExplorer
          locale={locale}
          regions={displayRegions}
          defaultVisibleCount={18}
          batchSize={18}
          columns="3"
          showCountryInStats={true}
          showScrollToTop={true}
        />
      </section>
    </main>
  );
}
