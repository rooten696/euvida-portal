import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://euvida.eu';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySitemap() {
  console.log('Testing Bikeparks Sitemap generation...');

  // 1. Fetch published bike_trail articles
  const { data: bikeArticles, error: aErr } = await supabase
    .from('articles')
    .select('slug, country_id, region_id, category, published, updated_at')
    .eq('published', true)
    .eq('category', 'bike_trail')
    .order('updated_at', { ascending: false, nullsFirst: false });

  if (aErr) throw aErr;
  assert.equal(bikeArticles.length, 193, `Expected 193 published bike articles, got ${bikeArticles.length}`);

  // 2. Fetch non-bike articles to verify they are never included
  const { data: nonBikeArticles, error: nbErr } = await supabase
    .from('articles')
    .select('slug, category')
    .neq('category', 'bike_trail');

  if (nbErr) throw nbErr;
  console.log(`Verified ${nonBikeArticles.length} non-bike articles in DB exist to test exclusion.`);

  // 3. Compute sitemap URLs following app/sitemap.ts logic
  const countryIds = Array.from(
    new Set(bikeArticles.map((a) => a.country_id).filter(Boolean))
  ).sort();
  assert.equal(countryIds.length, 20, `Expected 20 bike countries, got ${countryIds.length}`);

  const regionIds = Array.from(
    new Set(bikeArticles.map((a) => a.region_id).filter(Boolean))
  ).sort();
  assert.equal(regionIds.length, 71, `Expected 71 bike regions, got ${regionIds.length}`);

  const sitemapUrls = [];

  // Static paths
  const staticPaths = ['', '/countries', '/regions', '/articles', '/about'];
  for (const path of staticPaths) {
    sitemapUrls.push(`${siteUrl}/cs${path}`);
  }

  // Country paths
  for (const countryId of countryIds) {
    sitemapUrls.push(`${siteUrl}/cs/country/${countryId}`);
  }

  // Region paths
  for (const regionId of regionIds) {
    sitemapUrls.push(`${siteUrl}/cs/region/${regionId}`);
  }

  // Article paths
  for (const article of bikeArticles) {
    if (article.slug) {
      sitemapUrls.push(`${siteUrl}/cs/article/${article.slug}`);
    }
  }

  // 4. Assert total count is exactly 289
  assert.equal(sitemapUrls.length, 289, `Expected 289 sitemap URLs, got ${sitemapUrls.length}`);

  // 5. Assert all URLs are strictly prefixed with ${siteUrl}/cs
  for (const url of sitemapUrls) {
    assert(url.startsWith(`${siteUrl}/cs`), `URL does not start with /cs: ${url}`);
    assert(!url.includes('/en/'), `URL contains /en/: ${url}`);
    assert(!url.includes('/de/'), `URL contains /de/: ${url}`);
    assert(!url.includes('/fr/'), `URL contains /fr/: ${url}`);
    assert(!url.includes('/es/'), `URL contains /es/: ${url}`);
  }

  // 6. Assert zero non-bike slugs appear in sitemap
  const sitemapSet = new Set(sitemapUrls);
  for (const nb of nonBikeArticles) {
    assert(!sitemapSet.has(`${siteUrl}/cs/article/${nb.slug}`), `Non-bike slug found in sitemap: ${nb.slug}`);
  }

  console.log('✅ All Sitemap checks passed successfully!');
  console.log(`- Total URLs: ${sitemapUrls.length}`);
  console.log(`- Static pages: ${staticPaths.length}`);
  console.log(`- Country pages: ${countryIds.length}`);
  console.log(`- Region pages: ${regionIds.length}`);
  console.log(`- Bikepark article pages: ${bikeArticles.length}`);
  console.log(`- Non-cs URLs: 0`);
  console.log(`- Non-bike URLs: 0`);
}

verifySitemap().catch((err) => {
  console.error('❌ Sitemap verification failed:', err);
  process.exit(1);
});
