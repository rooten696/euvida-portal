type SearchParamsReader = Pick<URLSearchParams, 'get'>;

const contextKeys = ['category', 'country'] as const;
const safeTokenPattern = /^[a-z0-9_-]{1,64}$/i;

function normalizeSelection(value: string | null, uppercase: boolean): string[] {
  if (!value) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const rawToken of value.split(',')) {
    const trimmed = rawToken.trim();
    const token = uppercase ? trimmed.toUpperCase() : trimmed.toLowerCase();

    if (!token || token.toLowerCase() === 'all' || !safeTokenPattern.test(token) || seen.has(token)) {
      continue;
    }

    seen.add(token);
    result.push(token);
  }

  return result;
}

export function getBrowseContextQuery(searchParams: SearchParamsReader): string {
  const params = new URLSearchParams();
  const categories = normalizeSelection(searchParams.get('category'), false);
  const countries = normalizeSelection(searchParams.get('country'), true);

  if (categories.length > 0) {
    params.set('category', categories.join(','));
  }

  if (countries.length > 0) {
    params.set('country', countries.join(','));
  }

  return params.toString();
}

export function withBrowseContext(href: string, browseContextQuery: string): string {
  if (!browseContextQuery) {
    return href;
  }

  const [withoutHash, hash = ''] = href.split('#', 2);
  const [pathname, existingQuery = ''] = withoutHash.split('?', 2);
  const params = new URLSearchParams(existingQuery);
  const contextParams = new URLSearchParams(browseContextQuery);

  for (const key of contextKeys) {
    const value = contextParams.get(key);
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}
