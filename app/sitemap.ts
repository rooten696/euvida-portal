import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://euvida.eu';
const locales = ['cs', 'en', 'de', 'fr', 'es'];

export const revalidate = 21600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch dynamic data from database
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, updated_at')
    .eq('published', true)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(5000);
  
  const { data: regions } = await supabase
    .from('regions')
    .select('id');
    
  const { data: countries } = await supabase
    .from('countries')
    .select('id');

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Static routes
  const staticPaths = ['', '/countries', '/regions', '/articles', '/about'];

  for (const locale of locales) {
    // 1. Static pages
    for (const path of staticPaths) {
      sitemapEntries.push({
        url: `${siteUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: path === '' ? 1.0 : 0.8,
      });
    }

    // 2. Country Guide Pages
    if (countries) {
      for (const country of countries) {
        sitemapEntries.push({
          url: `${siteUrl}/${locale}/country/${country.id}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }

    // 3. Region Guide Pages
    if (regions) {
      for (const region of regions) {
        sitemapEntries.push({
          url: `${siteUrl}/${locale}/region/${region.id}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }

    // 4. Article Detail Pages
    if (articles) {
      for (const article of articles) {
        sitemapEntries.push({
          url: `${siteUrl}/${locale}/article/${article.slug}`,
          lastModified: new Date(article.updated_at || new Date()),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }
  }

  return sitemapEntries;
}
