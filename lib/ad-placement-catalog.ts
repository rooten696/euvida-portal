import type { SupportedLocale } from './articleTypes';
import { isSafeProviderUrl } from './affiliate-link-validation.mjs';

export const ALLOWED_AD_SLOTS = ['header', 'panel', 'footer'] as const;
export type AdPlacementSlot = (typeof ALLOWED_AD_SLOTS)[number];

export const ALLOWED_AD_PROVIDERS = ['travelpayouts', 'internal', 'custom_partner'] as const;
export type AdPlacementProvider = (typeof ALLOWED_AD_PROVIDERS)[number];

export const ALLOWED_CONSENT_CATEGORIES = ['marketing', 'statistics', 'functional'] as const;
export type AdConsentCategory = (typeof ALLOWED_CONSENT_CATEGORIES)[number];

export const ALLOWED_HTTPS_HOSTS = new Set([
  'tp.media',
  'tpwgt.com',
  'c104.travelpayouts.com',
  'whitelabel.travelpayouts.com',
  'euvida.cz',
  'euvida.eu',
]);

const LOCALES: SupportedLocale[] = ['cs', 'en', 'de', 'fr', 'es'];

export interface WidgetCatalogEntry {
  widgetType: string;
  provider: AdPlacementProvider;
  allowedSlots: AdPlacementSlot[];
  defaultConsentCategory: AdConsentCategory;
  validateParams: (params: Record<string, unknown>) => { valid: boolean; error?: string };
}

function containsUnsafeTokens(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return (
      lower.includes('<script') ||
      lower.includes('javascript:') ||
      lower.includes('eval(') ||
      lower.includes('onerror=') ||
      lower.includes('onload=') ||
      lower.includes('<iframe') ||
      lower.includes('<img') ||
      lower.includes('<object') ||
      lower.includes('<embed') ||
      /<\s*\/?[a-z][^>]*>/i.test(value) // HTML tags
    );
  }
  if (Array.isArray(value)) {
    return value.some(containsUnsafeTokens);
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(containsUnsafeTokens);
  }
  return false;
}

export function isAllowlistedAdHost(urlString: string): boolean {
  if (typeof urlString !== 'string' || !urlString.trim()) return false;
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:' || parsed.port !== '' || parsed.username || parsed.password) {
      return false;
    }
    return ALLOWED_HTTPS_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export type ParsedTravelpayoutsWidgetSnippet =
  | { valid: true; scriptSrc: string }
  | { valid: false; error: string };

export function parseTravelpayoutsWidgetSnippet(
  value: string
): ParsedTravelpayoutsWidgetSnippet {
  if (typeof value !== 'string') {
    return { valid: false, error: 'Travelpayouts widget code must be text' };
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 8_192) {
    return { valid: false, error: 'Travelpayouts widget code is empty or too long' };
  }

  let scriptSrc = trimmed;
  if (!/^https:\/\//i.test(trimmed)) {
    const scriptMatch = trimmed.match(/^<script\b([^>]*)>\s*<\/script>$/i);
    if (!scriptMatch) {
      return { valid: false, error: 'Paste one external <script ...></script> widget without inline code' };
    }
    const srcMatches = [...scriptMatch[1].matchAll(/\bsrc\s*=\s*(["'])(.*?)\1/gi)];
    if (srcMatches.length !== 1 || !srcMatches[0][2]) {
      return { valid: false, error: 'Travelpayouts widget must contain exactly one quoted src attribute' };
    }
    scriptSrc = srcMatches[0][2].replaceAll('&amp;', '&');
  }

  if (scriptSrc.length > 4_096) {
    return { valid: false, error: 'Travelpayouts widget URL is too long' };
  }

  try {
    const parsed = new URL(scriptSrc);
    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname !== 'tpwgt.com' ||
      parsed.port !== '' ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/content' ||
      parsed.hash
    ) {
      return { valid: false, error: 'Widget URL must use exactly https://tpwgt.com/content' };
    }

    const trs = parsed.searchParams.getAll('trs');
    const shmarker = parsed.searchParams.getAll('shmarker');
    if (trs.length !== 1 || trs[0] !== '572910') {
      return { valid: false, error: 'Widget URL must contain exactly one trs=572910' };
    }
    if (
      shmarker.length !== 1 ||
      !/^776456(?:\.[A-Za-z0-9_-]{1,64})?$/.test(shmarker[0])
    ) {
      return { valid: false, error: 'Widget URL must use shmarker=776456 (optional safe submarker allowed)' };
    }

    return { valid: true, scriptSrc: parsed.toString() };
  } catch {
    return { valid: false, error: 'Invalid Travelpayouts widget URL' };
  }
}

export const WIDGET_CATALOG: Record<string, WidgetCatalogEntry> = {
  travelpayouts_search_widget: {
    widgetType: 'travelpayouts_search_widget',
    provider: 'travelpayouts',
    allowedSlots: ['header', 'panel', 'footer'],
    defaultConsentCategory: 'marketing',
    validateParams: (params: Record<string, unknown>) => {
      if (containsUnsafeTokens(params)) {
        return { valid: false, error: 'Unsafe content or script rejected in widget params' };
      }
      if (params.domain && typeof params.domain === 'string') {
        if (!isAllowlistedAdHost(`https://${params.domain}`)) {
          return { valid: false, error: 'Domain must be allowlisted' };
        }
      }
      return { valid: true };
    },
  },
  travelpayouts_banner: {
    widgetType: 'travelpayouts_banner',
    provider: 'travelpayouts',
    allowedSlots: ['header', 'panel', 'footer'],
    defaultConsentCategory: 'marketing',
    validateParams: (params: Record<string, unknown>) => {
      if (containsUnsafeTokens(params)) {
        return { valid: false, error: 'Unsafe content or script rejected in widget params' };
      }
      if (params.url && typeof params.url === 'string') {
        const urlStr = params.url;
        if (!isAllowlistedAdHost(urlStr)) {
          return { valid: false, error: 'Banner URL must be allowlisted HTTPS host' };
        }
        try {
          const parsed = new URL(urlStr);
          if (parsed.hostname === 'tp.media') {
            const marker = parsed.searchParams.getAll('marker');
            const trs = parsed.searchParams.getAll('trs');
            const subId = parsed.searchParams.getAll('sub_id');
            const u = parsed.searchParams.getAll('u');
            if (marker.length !== 1 || marker[0] !== '776456') {
              return { valid: false, error: 'tp.media banner URL must contain exactly one marker=776456' };
            }
            if (trs.length !== 1 || trs[0] !== '572910') {
              return { valid: false, error: 'tp.media banner URL must contain exactly one trs=572910' };
            }
            if (subId.length !== 1 || !/^[a-zA-Z0-9_.-]{1,120}$/.test(subId[0])) {
              return { valid: false, error: 'tp.media banner URL must contain exactly one valid sub_id' };
            }
            if (u.length !== 1 || !isSafeProviderUrl(u[0])) {
              return { valid: false, error: 'tp.media banner URL must contain exactly one allowlisted destination in u (no open redirect)' };
            }
          }
        } catch {
          return { valid: false, error: 'Invalid banner URL' };
        }
      }
      return { valid: true };
    },
  },
  travelpayouts_script_widget: {
    widgetType: 'travelpayouts_script_widget',
    provider: 'travelpayouts',
    allowedSlots: ['header', 'panel', 'footer'],
    defaultConsentCategory: 'marketing',
    validateParams: (params: Record<string, unknown>) => {
      if (Object.keys(params).length !== 1 || typeof params.script_src !== 'string') {
        return { valid: false, error: 'Travelpayouts script widget requires only script_src' };
      }
      const parsed = parseTravelpayoutsWidgetSnippet(params.script_src);
      return parsed.valid ? { valid: true } : { valid: false, error: parsed.error };
    },
  },
  internal_promo: {
    widgetType: 'internal_promo',
    provider: 'internal',
    allowedSlots: ['header', 'panel', 'footer'],
    defaultConsentCategory: 'functional',
    validateParams: (params: Record<string, unknown>) => {
      if (containsUnsafeTokens(params)) {
        return { valid: false, error: 'Unsafe content or script rejected in widget params' };
      }
      const title = params.title as Record<string, string> | undefined;
      const description = params.description as Record<string, string> | undefined;
      const cta = params.cta as Record<string, string> | undefined;
      const targetPath = params.target_path;

      if (!title || !description || !cta || typeof targetPath !== 'string') {
        return { valid: false, error: 'internal_promo requires title, description, cta, and target_path' };
      }

      for (const loc of LOCALES) {
        if (!title[loc] || !description[loc] || !cta[loc]) {
          return { valid: false, error: `internal_promo must provide all 5 locales (missing ${loc})` };
        }
      }

      if (!targetPath.startsWith('/') && !isAllowlistedAdHost(targetPath)) {
        return { valid: false, error: 'target_path must be a relative path or allowlisted host' };
      }

      return { valid: true };
    },
  },
};

export function validateAdPlacementParams(
  widgetType: string,
  params: unknown
): { valid: boolean; error?: string } {
  const catalogEntry = WIDGET_CATALOG[widgetType];
  if (!catalogEntry) {
    return { valid: false, error: `Unknown widget type: ${widgetType}` };
  }
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return { valid: false, error: 'Widget params must be an object' };
  }
  return catalogEntry.validateParams(params as Record<string, unknown>);
}
