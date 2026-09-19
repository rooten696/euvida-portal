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
