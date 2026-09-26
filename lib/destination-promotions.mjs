import { isValidAffiliateUrl, isSafeProviderUrl, AFFILIATE_PROJECT, AFFILIATE_MARKER } from './affiliate-link-validation.mjs';

export const SUPPORTED_TARGET_TYPES = ['article', 'region', 'country'];
export const SUPPORTED_LOCALES = ['cs', 'en', 'de', 'fr', 'es'];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COUNTRY_CODE_REGEX = /^[a-z]{2,3}$/i;
const CAMPAIGN_ID_REGEX = /^[a-z0-9_]+(?:-[a-z0-9_]+)*$/;
const SUB_ID_REGEX = /^eu_(cs|en|de|fr|es)_(?:country_([a-z]{2,3})|region_([0-9a-f]{32})|(?!country_|region_)([a-z0-9]+(?:-[a-z0-9]+)*))_([a-z0-9_]+(?:-[a-z0-9_]+)*)_end_v1$/;

/**
 * Generate a deterministic, PII-free SubID for tracking.
 * - region:  eu_{locale}_region_{uuidhex}_{campaignId}_end_v1
 * - country: eu_{locale}_country_{iso3lower}_{campaignId}_end_v1
 * - article: eu_{locale}_{articleSlug}_{campaignId}_end_v1
 */
export function buildDestinationSubId(targetType, targetId, campaignId, locale) {
  if (!SUPPORTED_TARGET_TYPES.includes(targetType)) {
    throw new Error(`Unsupported target type: ${targetType}`);
  }
  if (!SUPPORTED_LOCALES.includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }
  if (typeof campaignId !== 'string' || !CAMPAIGN_ID_REGEX.test(campaignId)) {
    throw new Error(`Invalid campaign ID: ${campaignId}`);
  }

  if (targetType === 'region') {
    if (typeof targetId !== 'string' || !UUID_REGEX.test(targetId)) {
      throw new Error(`Invalid region UUID: ${targetId}`);
    }
    const hex = targetId.replace(/-/g, '').toLowerCase();
    return `eu_${locale}_region_${hex}_${campaignId}_end_v1`;
  }

  if (targetType === 'country') {
    if (typeof targetId !== 'string' || !COUNTRY_CODE_REGEX.test(targetId)) {
      throw new Error(`Invalid country code: ${targetId}`);
    }
    const code = targetId.toLowerCase();
    return `eu_${locale}_country_${code}_${campaignId}_end_v1`;
  }

  // article
  if (typeof targetId !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(targetId)) {
    throw new Error(`Invalid article slug: ${targetId}`);
  }
  return `eu_${locale}_${targetId}_${campaignId}_end_v1`;
}

/**
 * Check if a sub_id string matches the anchored, expected format.
 */
export function isDestinationSubIdValid(subId) {
  if (typeof subId !== 'string' || subId.length === 0 || subId.length > 120) {
    return false;
  }
  return SUB_ID_REGEX.test(subId);
}

/**
 * Parse an existing sub_id into structured components if valid.
 */
export function parseDestinationSubId(subId) {
  if (!isDestinationSubIdValid(subId)) return null;
  const match = subId.match(SUB_ID_REGEX);
  if (!match) return null;

  const locale = match[1];
  const countryCode = match[2];
  const regionHex = match[3];
  const articleSlug = match[4];
  const campaignId = match[5];

  if (countryCode) {
    return { targetType: 'country', targetId: countryCode, campaignId, locale };
  }
  if (regionHex) {
    // Restore hyphenated UUID
    const uuid = `${regionHex.slice(0, 8)}-${regionHex.slice(8, 12)}-${regionHex.slice(12, 16)}-${regionHex.slice(16, 20)}-${regionHex.slice(20, 32)}`;
    return { targetType: 'region', targetId: uuid, campaignId, locale };
  }
  return { targetType: 'article', targetId: articleSlug, campaignId, locale };
}

export {
  isValidAffiliateUrl,
  isSafeProviderUrl,
  AFFILIATE_PROJECT,
  AFFILIATE_MARKER,
};
