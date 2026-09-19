export const AFFILIATE_PROJECT = 572910;
export const AFFILIATE_MARKER = 776456;

const PROVIDER_HOSTS = new Set([
  'www.booking.com',
  'www.getyourguide.com',
  'www.viator.com',
  'www.tiqets.com',
  'www.rentalcars.com',
  'www.discovercars.com',
  'www.economybookings.com',
  'www.airalo.com',
  'www.yesim.app',
]);


function parseSafeProviderUrl(value) {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.port !== '' ||
      url.username ||
      url.password ||
      !PROVIDER_HOSTS.has(url.hostname)
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function hasSingleValue(url, name, expected) {
  const values = url.searchParams.getAll(name);
  return values.length === 1 && values[0] === expected;
}

export function isSafeProviderUrl(value) {
  return parseSafeProviderUrl(value) !== null;
}

export function isValidAffiliateUrl(
  value,
  expectedSubId,
  expectedSourceUrl,
  project = AFFILIATE_PROJECT,
  marker = AFFILIATE_MARKER,
) {
  if (typeof value !== 'string' || typeof expectedSubId !== 'string' || expectedSubId.length === 0) {
    return false;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.hostname !== 'tp.media') {
    return false;
  }

  if (
    url.protocol !== 'https:' ||
    url.port !== '' ||
    url.username ||
    url.password ||
    !hasSingleValue(url, 'trs', String(project)) ||
    !hasSingleValue(url, 'marker', String(marker)) ||
    !hasSingleValue(url, 'sub_id', expectedSubId)
  ) {
    return false;
  }

  const destinations = url.searchParams.getAll('u');
  if (destinations.length !== 1 || parseSafeProviderUrl(destinations[0]) === null) {
    return false;
  }

  return expectedSourceUrl === undefined || destinations[0] === expectedSourceUrl;
}

export function reusableAffiliateLink(
  record,
  request,
  project = AFFILIATE_PROJECT,
  marker = AFFILIATE_MARKER,
) {
  return record?.sourceUrl === request.url &&
    record?.subId === request.sub_id &&
    isValidAffiliateUrl(record?.url, request.sub_id, request.url, project, marker);
}
