import {
  AFFILIATE_MARKER,
  AFFILIATE_PROJECT,
  isSafeProviderUrl,
  isValidAffiliateUrl,
  reusableAffiliateLink,
} from '../lib/affiliate-link-validation.mjs';

export {
  AFFILIATE_MARKER,
  AFFILIATE_PROJECT,
  isSafeProviderUrl,
  isValidAffiliateUrl,
  reusableAffiliateLink,
};

export function normalizeAffiliateSource(offer, locale) {
  const source = new URL(offer.url);
  if (!isSafeProviderUrl(source.href)) throw new Error('source host');
  if (offer.provider === 'Booking.com') {
    source.pathname = source.pathname.replace(/\.html$/, `.${locale === 'en' ? 'en-gb' : locale}.html`);
  }
  if (!isSafeProviderUrl(source.href)) throw new Error('source host');
  return source.href;
}
