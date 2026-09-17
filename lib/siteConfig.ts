/**
 * Site configuration and canonical URL helpers for EUVIDA portal (.eu).
 *
 * All public canonical URLs, sitemaps, robots.txt, and hreflang links MUST
 * resolve to the final production origin: https://www.euvida.eu.
 *
 * Legacy NEXT_PUBLIC_SITE_URL="https://euvida.eu" or preview URLs must
 * never pollute public canonical URLs.
 */

export const CANONICAL_SITE_URL = 'https://www.euvida.eu';

/**
 * Returns the canonical site origin.
 * Guards against legacy non-www NEXT_PUBLIC_SITE_URL="https://euvida.eu"
 * or Vercel preview environments polluting production canonical URLs.
 */
export function getCanonicalSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!envUrl) {
    return CANONICAL_SITE_URL;
  }

  try {
    const parsed = new URL(envUrl.startsWith('http') ? envUrl : `https://${envUrl}`);
    // If the host is euvida.eu or www.euvida.eu, always normalize to www.euvida.eu
    if (parsed.hostname === 'euvida.eu' || parsed.hostname === 'www.euvida.eu') {
      return CANONICAL_SITE_URL;
    }
    // Preview deployments (e.g. *.vercel.app) must never become public canonicals
    if (parsed.hostname.endsWith('.vercel.app')) {
      return CANONICAL_SITE_URL;
    }
    return CANONICAL_SITE_URL;
  } catch {
    return CANONICAL_SITE_URL;
  }
}

export const canonicalMetadataBase: URL = new URL(CANONICAL_SITE_URL);

/**
 * Generates an absolute canonical URL for a given path.
 */
export function getCanonicalUrl(path = ''): string {
  if (!path || path === '/') {
    return CANONICAL_SITE_URL;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${CANONICAL_SITE_URL}${cleanPath}`;
}
