import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://euvida.eu';

export const revalidate = 86400; // Kešování sitemapy na 24 hodin

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch published bike_trail articles only
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, country_id, region_id, updated_at')
    .eq('published', true)
    .eq('category', 'bike_trail')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(10000);

  const publishedArticles = articles ?? [];

  // Extract unique country IDs and region IDs that have published bike articles
  const countryIds = Array.from(
    new Set(publishedArticles.map((a) => a.country_id).filter((id): id is string => Boolean(id)))
  ).sort();

  const regionIds = Array.from(
    new Set(publishedArticles.map((a) => a.region_id).filter((id): id is string => Boolean(id)))
  ).sort();

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // 1. Static routes (strictly /cs)
  const staticPaths = ['', '/countries', '/regions', '/articles', '/about'];
  for (const path of staticPaths) {
    sitemapEntries.push({
      url: `${siteUrl}/cs${path}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: path === '' ? 1.0 : 0.8,
    });
  }

  // 2. Country Guide Pages (strictly /cs, 20 bike countries)
  for (const countryId of countryIds) {
    sitemapEntries.push({
      url: `${siteUrl}/cs/country/${countryId}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  // 3. Region Guide Pages (strictly /cs, 71 bike regions)
  for (const regionId of regionIds) {
    sitemapEntries.push({
      url: `${siteUrl}/cs/region/${regionId}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  // 4. Article Detail Pages (strictly /cs, 193 bike_trail articles)
  for (const article of publishedArticles) {
    if (article.slug) {
      sitemapEntries.push({
        url: `${siteUrl}/cs/article/${article.slug}`,
        lastModified: new Date(article.updated_at || new Date()),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }

  return sitemapEntries;
}
