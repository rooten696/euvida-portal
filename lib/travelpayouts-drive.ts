import type { SupportedLocale } from './articleTypes';
import { supportedLocales } from './articleTypes';

export const DRIVE_HOST = 'emrldco.com';
export const DRIVE_PATH = '/NTcyOTEw.js';
export const DRIVE_TRS = '572910';
export const DRIVE_DEFAULT_MARKER = '776456';

export type DrivePageType = 'article' | 'region' | 'place';

export interface DriveRouteEligibility {
  eligible: boolean;
  pageType?: DrivePageType;
  id?: string;
  locale?: SupportedLocale;
}

const SUPPORTED_LOCALES_SET = new Set<string>(supportedLocales);

export const COOKIE_CONSENT_KEY = 'cookie_consent';
export const COOKIE_CONSENT_GRANTED = 'granted';
export const COOKIE_CONSENT_EVENTS = [
  'storage',
  'euvida:cookie-consent',
  'cookie_consent_updated',
] as const;

/**
 * Excluded sections:
 * - admin (administration)
 * - privacy, terms, legal, cookies, impressum (legal)
 * - about, contact, login, profile, oblibene (general/system/user)
 */
export const EXCLUDED_SECTIONS = new Set([
  'admin',
  'privacy',
  'terms',
  'legal',
  'cookies',
  'impressum',
  'about',
  'contact',
  'login',
  'profile',
  'oblibene',
]);

/**
 * Evaluates whether a given pathname is eligible for the Travelpayouts Drive experiment.
 * Scope: active on all public articles, regions, and places/countries across all supported languages.
 * Excludes: homepage, administration, legal pages, and general/system/user pages.
 */
export function isDriveEligibleRoute(pathname: string): DriveRouteEligibility {
  if (typeof pathname !== 'string' || !pathname.trim()) {
    return { eligible: false };
  }

  // Strip protocol, host (if full URL passed), query params and fragment
  const pathWithoutQuery = pathname.split('?')[0].split('#')[0];
  let normalizedPath = pathWithoutQuery;
  try {
    if (pathWithoutQuery.startsWith('http://') || pathWithoutQuery.startsWith('https://')) {
      normalizedPath = new URL(pathWithoutQuery).pathname;
    }
  } catch {
    // Keep pathWithoutQuery if URL parsing fails
  }

  // Strip trailing slashes
  const trimmed = normalizedPath.replace(/\/+$/, '') || '/';
  const segments = trimmed.split('/').filter(Boolean);

  if (segments.length === 0) {
    // Root homepage: /
    return { eligible: false };
  }

  const locale = segments[0] as SupportedLocale;
  if (!SUPPORTED_LOCALES_SET.has(locale)) {
    // Unsupported or missing locale
    return { eligible: false };
  }

  if (segments.length === 1) {
    // Localized homepage: /[locale]
    return { eligible: false };
  }

  const section = segments[1].toLowerCase();

  if (EXCLUDED_SECTIONS.has(section)) {
    return { eligible: false };
  }

  // 1. Articles
  if (section === 'article' && segments.length === 3 && segments[2].trim()) {
    return {
      eligible: true,
      pageType: 'article',
      id: segments[2].trim(),
      locale,
    };
  }
  if (section === 'articles' && segments.length === 2) {
    return {
      eligible: true,
      pageType: 'article',
      id: 'catalog',
      locale,
    };
  }

  // 2. Regions
  if (section === 'region' && segments.length === 3 && segments[2].trim()) {
    return {
      eligible: true,
      pageType: 'region',
      id: segments[2].trim(),
      locale,
    };
  }
  if (section === 'regions' && segments.length === 2) {
    return {
      eligible: true,
      pageType: 'region',
      id: 'catalog',
      locale,
    };
  }

  // 3. Places (Countries/Destinations)
  if (section === 'country' && segments.length === 3 && segments[2].trim()) {
    return {
      eligible: true,
      pageType: 'place',
      id: segments[2].trim(),
      locale,
    };
  }
  if (section === 'countries' && segments.length === 2) {
    return {
      eligible: true,
      pageType: 'place',
      id: 'catalog',
      locale,
    };
  }

  return { eligible: false };
}

export interface DriveSubIdParams {
  locale: string;
  pageType: DrivePageType;
  id: string;
  placement?: string;
}

/**
 * Generates a deterministic, PII-free SubID for Travelpayouts tracking.
 * Format: eu_${locale}_${pageType}_${cleanId}_${placement}
 * Enforces strict character allowlist and bounds.
 */
export function generateDriveSubId({
  locale,
  pageType,
  id,
  placement = 'drive',
}: DriveSubIdParams): string {
  const loc = (locale || 'cs').toLowerCase().slice(0, 2);
  const type = (pageType || 'article').toLowerCase().slice(0, 10);
  const plc = (placement || 'drive').toLowerCase().slice(0, 10);

  // Sanitize id: replace spaces/non-alphanumeric with underscore, keep dashes
  const cleanId = String(id || 'default')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'default';

  return `eu_${loc}_${type}_${cleanId}_${plc}`;
}

export type ParsedTravelpayoutsDriveSnippet =
  | {
      valid: true;
      scriptSrc: string;
      trs: string;
      marker?: string;
    }
  | {
      valid: false;
      error: string;
    };

/**
 * Validates Travelpayouts Drive snippet or direct script URL.
 * Enforces safe-third-party-script-widgets security invariants:
 * - exact HTTPS scheme
 * - exact host emrldco.com
 * - exact path /NTcyOTEw.js (Base64 of TRS 572910)
 * - exact project account t=572910
 * - marker matching project affiliate marker 776456 (or 776456.submarker)
 * - only parameters consumed by the official loader (`t` and `marker`)
 * - duplicate parameter rejection
 * - no raw HTML or inline script bodies
 */
export function parseTravelpayoutsDriveSnippet(value: string): ParsedTravelpayoutsDriveSnippet {
  if (typeof value !== 'string') {
    return { valid: false, error: 'Snippet or URL must be text' };
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 8_192) {
    return { valid: false, error: 'Snippet is empty or too long' };
  }

  let scriptSrc = trimmed;

  if (trimmed.toLowerCase().includes('<script')) {
    const scriptMatch = trimmed.match(/^<script\b([^>]*)>\s*<\/script>$/i);
    if (!scriptMatch) {
      return {
        valid: false,
        error: 'Paste one external <script ...></script> element with empty body',
      };
    }
    const srcMatches = [...scriptMatch[1].matchAll(/\bsrc\s*=\s*(["'])(.*?)\1/gi)];
    if (srcMatches.length !== 1 || !srcMatches[0][2]) {
      return {
        valid: false,
        error: 'Script tag must contain exactly one quoted src attribute',
      };
    }
    scriptSrc = srcMatches[0][2].replaceAll('&amp;', '&');
  }

  if (scriptSrc.length > 2_048) {
    return { valid: false, error: 'Drive script URL is too long' };
  }

  try {
    const parsed = new URL(scriptSrc);

    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname !== DRIVE_HOST ||
      parsed.port !== '' ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== DRIVE_PATH ||
      parsed.hash
    ) {
      return {
        valid: false,
        error: `Drive script URL must use https://${DRIVE_HOST}${DRIVE_PATH} without credentials, custom port or hash`,
      };
    }

    // Verify allowed search param keys
    const allowedKeys = new Set(['t', 'marker']);
    for (const key of parsed.searchParams.keys()) {
      if (!allowedKeys.has(key)) {
        return { valid: false, error: `Disallowed query parameter: ${key}` };
      }
    }

    // Mandatory TRS parameter
    const trsValues = parsed.searchParams.getAll('t');
    if (trsValues.length !== 1 || trsValues[0] !== DRIVE_TRS) {
      return { valid: false, error: `Drive URL must contain exactly one t=${DRIVE_TRS}` };
    }

    // Optional marker parameter
    let marker: string | undefined;
    const markerValues = parsed.searchParams.getAll('marker');
    if (markerValues.length > 1) {
      return { valid: false, error: 'Drive URL cannot contain duplicate marker parameters' };
    }
    if (markerValues.length === 1) {
      marker = markerValues[0];
      if (!/^776456(?:\.[a-zA-Z0-9_.-]{1,64})?$/.test(marker)) {
        return {
          valid: false,
          error: 'Drive marker must be 776456 or 776456.<submarker>',
        };
      }
    }

    return {
      valid: true,
      scriptSrc: parsed.toString(),
      trs: DRIVE_TRS,
      marker,
    };
  } catch {
    return { valid: false, error: 'Invalid Drive script URL' };
  }
}

/**
 * Builds the canonical official Travelpayouts Drive script URL for the Euvida project.
 */
export function buildDriveScriptUrl(options?: { subId?: string; marker?: string }): string {
  const url = new URL(`https://${DRIVE_HOST}${DRIVE_PATH}`);
  url.searchParams.set('t', DRIVE_TRS);

  if (options?.marker) {
    url.searchParams.set('marker', options.marker);
  } else if (options?.subId) {
    url.searchParams.set('marker', `${DRIVE_DEFAULT_MARKER}.${options.subId}`);
  }

  return url.toString();
}
