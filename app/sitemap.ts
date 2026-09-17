import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supportedLocales, Article } from '@/lib/articleTypes';
import { getAvailableArticleLocales } from '@/lib/articleLocalization';
import { getCanonicalUrl } from '@/lib/siteConfig';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const revalidate = 86400; // Kešování sitemapy na 24 hodin

type CountryRow = {
  id: string;
  name?: string | null;
  translations?: Record<string, { name?: string | null } | undefined> | null;
  updated_at?: string | null;
};

type RegionRow = {
  id: string;
  name?: string | null;
  translations?: Record<string, { name?: string | null } | undefined> | null;
  updated_at?: string | null;
};

function parseSafeDate(dateString: string | null | undefined): Date | undefined {
  if (!dateString) return undefined;
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? undefined : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // 1. Static routes across all 5 supported locales
  const staticPaths = ['', '/countries', '/regions', '/articles', '/about'];

  for (const path of staticPaths) {
    const languageAlternates: Record<string, string> = {};
    for (const locale of supportedLocales) {
      languageAlternates[locale] = getCanonicalUrl(`/${locale}${path}`);
    }

    for (const locale of supportedLocales) {
      sitemapEntries.push({
        url: getCanonicalUrl(`/${locale}${path}`),
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: path === '' ? 1.0 : 0.8,
        alternates: {
          languages: languageAlternates,
        },
      });
    }
  }

  // 2. Fetch countries with error handling
  try {
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('id, name, translations');

    if (countriesError) {
      console.error('[sitemap] Error fetching countries:', countriesError.message);
    } else if (countries) {
      const seenCountryIds = new Set<string>();

      for (const rawCountry of countries as CountryRow[]) {
        const countryId = typeof rawCountry.id === 'string' ? rawCountry.id.trim() : '';
        if (!countryId || seenCountryIds.has(countryId)) continue;
        seenCountryIds.add(countryId);

        // Determine available locales for country guide
        const availableLocales = supportedLocales.filter((loc) => {
          if (loc === 'cs') return Boolean(rawCountry.name && rawCountry.name.trim().length > 0);
          const translatedName = rawCountry.translations?.[loc]?.name;
          return Boolean(translatedName && translatedName.trim().length > 0);
        });

        if (availableLocales.length === 0) continue;

        const languageAlternates: Record<string, string> = {};
        for (const loc of availableLocales) {
          languageAlternates[loc] = getCanonicalUrl(`/${loc}/country/${countryId}`);
        }

        for (const loc of availableLocales) {
          sitemapEntries.push({
            url: getCanonicalUrl(`/${loc}/country/${countryId}`),
            changeFrequency: 'weekly',
            priority: 0.7,
            alternates: {
              languages: languageAlternates,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('[sitemap] Unexpected error processing countries:', err);
  }

  // 3. Fetch regions with error handling
  try {
    const { data: regions, error: regionsError } = await supabase
      .from('regions')
      .select('id, name, translations');

    if (regionsError) {
      console.error('[sitemap] Error fetching regions:', regionsError.message);
    } else if (regions) {
      const seenRegionIds = new Set<string>();

      for (const rawRegion of regions as RegionRow[]) {
        const regionId = typeof rawRegion.id === 'string' ? rawRegion.id.trim() : '';
        if (!regionId || seenRegionIds.has(regionId)) continue;
        seenRegionIds.add(regionId);

        // Determine available locales for region guide
        const availableLocales = supportedLocales.filter((loc) => {
          if (loc === 'cs') return Boolean(rawRegion.name && rawRegion.name.trim().length > 0);
          const translatedName = rawRegion.translations?.[loc]?.name;
          return Boolean(translatedName && translatedName.trim().length > 0);
        });

        if (availableLocales.length === 0) continue;

        const languageAlternates: Record<string, string> = {};
        for (const loc of availableLocales) {
          languageAlternates[loc] = getCanonicalUrl(`/${loc}/region/${regionId}`);
        }

        for (const loc of availableLocales) {
          sitemapEntries.push({
            url: getCanonicalUrl(`/${loc}/region/${regionId}`),
            changeFrequency: 'weekly',
            priority: 0.7,
            alternates: {
              languages: languageAlternates,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('[sitemap] Unexpected error processing regions:', err);
  }

  // 4. Fetch published articles with pagination and translation validation
  try {
    const seenSlugs = new Set<string>();
    const batchSize = 1000;
    let from = 0;

    while (true) {
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('slug, updated_at, created_at, title, content, translations')
        .eq('published', true)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .range(from, from + batchSize - 1);

      if (articlesError) {
        console.error('[sitemap] Error fetching articles batch:', articlesError.message);
        break;
      }

      if (!articles || articles.length === 0) {
        break;
      }

      for (const rawArticle of articles as Article[]) {
        const slug = typeof rawArticle.slug === 'string' ? rawArticle.slug.trim() : '';
        if (!slug || seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);

        // Only include locales that have genuine translation (avoid fallback pages)
        const availableLocales = getAvailableArticleLocales(rawArticle);
        if (availableLocales.length === 0) continue;

        const lastModified =
          parseSafeDate(rawArticle.updated_at) ??
          parseSafeDate(rawArticle.created_at) ??
          new Date();

        const languageAlternates: Record<string, string> = {};
        for (const loc of availableLocales) {
          languageAlternates[loc] = getCanonicalUrl(`/${loc}/article/${slug}`);
        }

        for (const loc of availableLocales) {
          sitemapEntries.push({
            url: getCanonicalUrl(`/${loc}/article/${slug}`),
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.6,
            alternates: {
              languages: languageAlternates,
            },
          });
        }
      }

      if (articles.length < batchSize) {
        break;
      }
      from += batchSize;
    }
  } catch (err) {
    console.error('[sitemap] Unexpected error processing articles:', err);
  }

  return sitemapEntries;
}
