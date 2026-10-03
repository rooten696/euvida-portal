const locales = new Set(['cs', 'en', 'de', 'fr', 'es']);

export function getArticleListingSelect(locale: string): string {
  const language = locales.has(locale) ? locale : 'cs';
  return 'id,slug,title,excerpt,image_url,image_alt,country_id,region_id,category,visit_info,published,featured,created_at,updated_at,reading_time_minutes,' +
    `listing_title:translations->${language}->>title,listing_excerpt:translations->${language}->>excerpt`;
}

export function normalizeArticleListing<T>(rows: unknown, locale: string): T[] {
  if (!Array.isArray(rows)) return [];
  const language = locales.has(locale) ? locale : 'cs';
  return rows.map(({ listing_title, listing_excerpt, ...row }) => ({
    ...row,
    translations: { [language]: { title: listing_title, excerpt: listing_excerpt } },
  })) as T[];
}
