export function canOptimizeImage(src: string): boolean {
  if (!src || /\.svg(?:\?|$)/i.test(src)) return false;
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && !url.username && !url.password &&
      url.hostname === 'fizkhbssvuluclgaqnkx.supabase.co' &&
      url.pathname.startsWith('/storage/v1/object/public/article-images/');
  } catch {
    return false;
  }
}
