import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { toArticleCardData, type ArticleCardData } from './articleCards';
import { getLocationName } from './articleLocalization';
import {
  extractArticleCoordinates,
  rankRelatedArticles,
  type ArticleCoordinates,
  type RelatedArticleReason,
} from './articleRecommendations';
import type { Article, LocationRecord, SupportedLocale } from './articleTypes';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const relatedArticleSelect =
  'id, slug, title, excerpt, translations, image_url, image_alt, country_id, region_id, category, visit_info, published, featured, created_at, reading_time_minutes';

type RecommendationIndexRow = {
  slug: string;
  country_id?: string | null;
  region_id?: string | null;
  category?: string | null;
  coordinates?: ArticleCoordinates | null;
};

type RawRecommendationIndexRow = Omit<RecommendationIndexRow, 'coordinates'> & {
  gps?: unknown;
  gps_items?: unknown;
  gps_cs?: unknown;
  gps_en?: unknown;
  gps_de?: unknown;
  gps_fr?: unknown;
  gps_es?: unknown;
};

const recommendationIndexSelect =
  'slug, country_id, region_id, category, gps:access_info->>gps, gps_items:access_info->items, gps_cs:access_info->cs->>gps, gps_en:access_info->en->>gps, gps_de:access_info->de->>gps, gps_fr:access_info->fr->>gps, gps_es:access_info->es->>gps';

function getProjectedAccessInfo(article: RawRecommendationIndexRow): unknown {
  return {
    gps: article.gps,
    items: article.gps_items,
    cs: { gps: article.gps_cs },
    en: { gps: article.gps_en },
    de: { gps: article.gps_de },
    fr: { gps: article.gps_fr },
    es: { gps: article.gps_es },
  };
}

type LocationNameRow = {
  id: string;
  name?: string | null;
  country_id?: string | null;
  name_cs?: string | null;
  name_en?: string | null;
  name_de?: string | null;
  name_fr?: string | null;
  name_es?: string | null;
};

const localizedNameFields =
  'name_cs:translations->cs->>name, name_en:translations->en->>name, name_de:translations->de->>name, name_fr:translations->fr->>name, name_es:translations->es->>name';
const countryLocationNameSelect = `id, name, ${localizedNameFields}`;
const regionLocationNameSelect = `id, name, country_id, ${localizedNameFields}`;

function toLocationRecord(row: LocationNameRow): LocationRecord {
  const translations = Object.fromEntries(
    (['cs', 'en', 'de', 'fr', 'es'] as const).flatMap((locale) => {
      const name = row[`name_${locale}`];
      return name ? [[locale, { name }]] : [];
    })
  );

  return {
    id: row.id,
    name: row.name,
    country_id: row.country_id,
    translations,
  };
}

export type RelatedArticleCard = {
  article: ArticleCardData;
  reason: RelatedArticleReason;
  distanceKm?: number;
};

const getRecommendationIndex = unstable_cache(
  async (): Promise<RecommendationIndexRow[]> => {
    const { data, error } = await supabase
      .from('articles')
      .select(recommendationIndexSelect)
      .eq('published', true)
      .limit(1000);

    if (error) {
      console.error('Unable to load related article index:', error.message);
      return [];
    }

    return ((data ?? []) as RawRecommendationIndexRow[]).map((article) => ({
      slug: article.slug,
      country_id: article.country_id,
      region_id: article.region_id,
      category: article.category,
      coordinates: extractArticleCoordinates(getProjectedAccessInfo(article), 'cs'),
    }));
  },
  ['euvida-related-article-index-v3'],
  { revalidate: 300, tags: ['articles'] }
);

const getLocationIndex = unstable_cache(
  async (): Promise<{
    countries: LocationRecord[];
    regions: LocationRecord[];
  }> => {
    const [countryResult, regionResult] = await Promise.all([
      supabase.from('countries').select(countryLocationNameSelect).limit(1000),
      supabase.from('regions').select(regionLocationNameSelect).limit(2500),
    ]);

    if (countryResult.error || regionResult.error) {
      console.error(
        'Unable to load related location index:',
        countryResult.error?.message ?? regionResult.error?.message
      );
      return { countries: [], regions: [] };
    }

    return {
      countries: ((countryResult.data ?? []) as unknown as LocationNameRow[]).map(toLocationRecord),
      regions: ((regionResult.data ?? []) as unknown as LocationNameRow[]).map(toLocationRecord),
    };
  },
  ['euvida-related-location-index-v2'],
  { revalidate: 300, tags: ['countries', 'regions'] }
);

export async function getRelatedArticleCards(
  currentArticle: Article,
  locale: SupportedLocale,
  limit = 3
): Promise<RelatedArticleCard[]> {
  const index = await getRecommendationIndex();
  const current = {
    slug: currentArticle.slug,
    countryId: currentArticle.country_id,
    regionId: currentArticle.region_id,
    category: currentArticle.category,
    coordinates: extractArticleCoordinates(currentArticle.access_info, locale),
  };
  const candidates = index.map((article) => ({
    article,
    slug: article.slug,
    countryId: article.country_id,
    regionId: article.region_id,
    category: article.category,
    coordinates: article.coordinates,
  }));
  const ranked = rankRelatedArticles(current, candidates, {
    limit,
    maxDistanceKm: 150,
  });

  if (ranked.length === 0) {
    return [];
  }

  const slugs = ranked.map(({ article }) => article.slug);
  const [{ data, error }, locations] = await Promise.all([
    supabase
      .from('articles')
      .select(relatedArticleSelect)
      .eq('published', true)
      .in('slug', slugs),
    getLocationIndex(),
  ]);

  if (error) {
    console.error('Unable to load related article cards:', error.message);
    return [];
  }

  const articlesBySlug = new Map(
    ((data ?? []) as Article[]).map((article) => [article.slug, article])
  );
  const countriesById = new Map(locations.countries.map((country) => [country.id, country]));
  const regionsById = new Map(locations.regions.map((region) => [region.id, region]));

  return ranked.flatMap(({ article: rankedArticle, reason, distanceKm }) => {
    const article = articlesBySlug.get(rankedArticle.slug);
    if (!article) {
      return [];
    }

    const country = article.country_id ? countriesById.get(article.country_id) : null;
    const region = article.region_id ? regionsById.get(article.region_id) : null;

    return [{
      article: toArticleCardData(article, locale, {
        countryName: getLocationName(country ?? null, locale),
        regionName: getLocationName(region ?? null, locale),
      }),
      reason,
      ...(distanceKm === undefined ? {} : { distanceKm }),
    }];
  });
}
