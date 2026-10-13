const filterKeys = ['category', 'country', 'region', 'city'] as const;

/** Reset the filters together, including any scope encoded by the current route. */
export function resetFilterHref(locale: string, searchParams: URLSearchParams, hash = ''): string {
  const params = new URLSearchParams(searchParams.toString());
  for (const key of filterKeys) params.delete(key);
  const query = params.toString();
  return `/${locale}${query ? `?${query}` : ''}${hash}`;
}

function routeFilters(pathname: string): URLSearchParams {
  const params = new URLSearchParams();
  const [, locale, type, id] = pathname.split('/');
  if (['cs', 'en', 'de', 'fr', 'es'].includes(locale) && id &&
      (type === 'country' || type === 'region' || type === 'city')) {
    params.set(type, type === 'country' ? id.toUpperCase() : id);
  }
  return params;
}

/** Carry only browsing context, never auth, preview or tracking parameters. */
export function withFilterContext(href: string, searchParams: URLSearchParams, pathname: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const target = new URL(href, 'https://local.invalid');
  const route = routeFilters(pathname);
  for (const key of filterKeys) {
    const value = searchParams.get(key) || route.get(key);
    if (value && !target.searchParams.has(key)) target.searchParams.set(key, value);
  }
  return `${target.pathname}${target.search}${target.hash}`;
}
