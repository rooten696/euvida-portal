import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
  ALLOWED_AD_PROVIDERS,
  ALLOWED_AD_SLOTS,
  ALLOWED_CONSENT_CATEGORIES,
  WIDGET_CATALOG,
  validateAdPlacementParams,
} from './ad-placement-catalog';
import { isValidAffiliateUrl } from './affiliate-link-validation.mjs';
import type { SupportedLocale } from './articleTypes';
import { ADMIN_EMAIL, isUserAdmin } from './adminIdentity';

export { ADMIN_EMAIL, isUserAdmin };

const LOCALES: SupportedLocale[] = ['cs', 'en', 'de', 'fr', 'es'];

export interface AdminAuthResult {
  authorized: boolean;
  status: number;
  error?: string;
  user?: User;
  client?: SupabaseClient;
  writeClient?: SupabaseClient;
}

export async function verifyAdminRequest(
  request: { method?: string; headers: { get: (name: string) => string | null } },
  customAuthClient?: { auth: { getUser: (token: string) => Promise<{ data: { user: User | null }; error: unknown }> } },
  options?: { requireWrite?: boolean }
): Promise<AdminAuthResult> {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';

  if (!accessToken) {
    return { authorized: false, status: 401, error: 'Unauthorized: missing bearer token' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const authClient = customAuthClient ?? createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await authClient.auth.getUser(accessToken);

  if (error || !data?.user) {
    return { authorized: false, status: 401, error: 'Unauthorized: invalid or expired session' };
  }

  const user = data.user;
  if (!isUserAdmin(user)) {
    return {
      authorized: false,
      status: 403,
      error: 'Forbidden: admin role required; authorized administrator account required',
    };
  }

  const method = typeof request.method === 'string' ? request.method.toUpperCase() : 'GET';
  const isWriteRequest = options?.requireWrite ?? (method !== 'GET' && method !== 'HEAD');

  if (isWriteRequest && !supabaseServiceKey) {
    return {
      authorized: false,
      status: 503,
      error: 'SUPABASE_SERVICE_ROLE_KEY is required for administrative write operations',
      user,
    };
  }

  if (supabaseServiceKey) {
    const privilegedClient = createClient(supabaseUrl, supabaseServiceKey);
    return {
      authorized: true,
      status: 200,
      user,
      client: privilegedClient,
      writeClient: privilegedClient,
    };
  }

  // Safe read-only client using authenticated user token; explicitly NO write fallback.
  const readOnlyClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  return {
    authorized: true,
    status: 200,
    user,
    client: readOnlyClient,
    writeClient: undefined,
  };
}

export function verifyOptimisticLock(
  record: { version?: number | null } | null | undefined,
  expectedVersion: number
): boolean {
  if (!record || typeof record.version !== 'number') return false;
  return record.version === expectedVersion;
}

export function validatePromotionRecord(data: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Promotion data must be an object' };
  }

  const { article_slug, campaign_id, provider, title, description, call_to_action, links } = data;

  if (typeof article_slug !== 'string' || !article_slug.trim()) {
    return { valid: false, error: 'article_slug is required' };
  }
  if (typeof campaign_id !== 'string' || !campaign_id.trim()) {
    return { valid: false, error: 'campaign_id is required' };
  }
  if (typeof provider !== 'string' || !provider.trim()) {
    return { valid: false, error: 'provider is required' };
  }

  if (!title || typeof title !== 'object') {
    return { valid: false, error: 'title must be a multilingual object' };
  }
  if (!description || typeof description !== 'object') {
    return { valid: false, error: 'description must be a multilingual object' };
  }
  if (!call_to_action || typeof call_to_action !== 'object') {
    return { valid: false, error: 'call_to_action must be a multilingual object' };
  }

  const titleObj = title as Record<string, string>;
  const descObj = description as Record<string, string>;
  const ctaObj = call_to_action as Record<string, string>;

  if (Object.keys(titleObj).sort().join(',') !== 'cs,de,en,es,fr') {
    return { valid: false, error: 'title must contain exact 5 locales (cs, en, de, fr, es)' };
  }
  if (Object.keys(descObj).sort().join(',') !== 'cs,de,en,es,fr') {
    return { valid: false, error: 'description must contain exact 5 locales (cs, en, de, fr, es)' };
  }
  if (Object.keys(ctaObj).sort().join(',') !== 'cs,de,en,es,fr') {
    return { valid: false, error: 'call_to_action must contain exact 5 locales (cs, en, de, fr, es)' };
  }

  for (const loc of LOCALES) {
    if (typeof titleObj[loc] !== 'string' || !titleObj[loc].trim()) {
      return { valid: false, error: `Missing title for locale: ${loc}` };
    }
    if (typeof descObj[loc] !== 'string' || !descObj[loc].trim()) {
      return { valid: false, error: `Missing description for locale: ${loc}` };
    }
    if (typeof ctaObj[loc] !== 'string' || !ctaObj[loc].trim()) {
      return { valid: false, error: `Missing call_to_action for locale: ${loc}` };
    }
  }

  if (!links || typeof links !== 'object') {
    return { valid: false, error: 'links must be a multilingual object' };
  }

  const linksObj = links as Record<string, Record<string, unknown>>;
  if (Object.keys(linksObj).sort().join(',') !== 'cs,de,en,es,fr') {
    return { valid: false, error: 'links must contain exact 5 locales (cs, en, de, fr, es)' };
  }

  for (const loc of LOCALES) {
    const link = linksObj[loc];
    if (!link || typeof link !== 'object' || typeof link.url !== 'string' || typeof link.subId !== 'string') {
      return { valid: false, error: `Missing valid link record for locale: ${loc}` };
    }
    const linkKeys = Object.keys(link).filter(k => link[k] !== undefined).sort();
    if (linkKeys.join(',') !== 'subId,url') {
      return { valid: false, error: `Invalid link shape: expected only url and subId for locale: ${loc}` };
    }

    const expectedSubId = `eu_${loc}_${article_slug}_${campaign_id}_end_v1`;
    if (link.subId !== expectedSubId) {
      return { valid: false, error: `Mismatched sub_id for locale ${loc}: expected ${expectedSubId}` };
    }
    if (!isValidAffiliateUrl(link.url, expectedSubId)) {
      return { valid: false, error: `Invalid affiliate URL for locale ${loc}` };
    }
    try {
      if (new URL(link.url).hostname !== 'tp.media') {
        return { valid: false, error: `Affiliate URL must use tp.media for locale ${loc}` };
      }
    } catch {
      return { valid: false, error: `Invalid affiliate URL for locale ${loc}` };
    }
  }

  return { valid: true };
}

export function validatePlacementRecord(data: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Placement data must be an object' };
  }

  const { slot, name, provider, widget_type, params, consent_category } = data;

  if (typeof slot !== 'string' || !ALLOWED_AD_SLOTS.includes(slot as typeof ALLOWED_AD_SLOTS[number])) {
    return { valid: false, error: 'slot must be one of header, panel, footer' };
  }
  if (typeof name !== 'string' || !name.trim()) {
    return { valid: false, error: 'name is required' };
  }
  if (typeof provider !== 'string' || !ALLOWED_AD_PROVIDERS.includes(provider as typeof ALLOWED_AD_PROVIDERS[number])) {
    return { valid: false, error: `provider must be one of: ${ALLOWED_AD_PROVIDERS.join(', ')}` };
  }
  if (typeof widget_type !== 'string' || !widget_type.trim()) {
    return { valid: false, error: 'widget_type is required' };
  }
  const catalogEntry = WIDGET_CATALOG[widget_type];
  if (!catalogEntry) {
    return { valid: false, error: `Unknown widget type: ${widget_type}` };
  }
  if (catalogEntry.provider !== provider) {
    return { valid: false, error: `provider does not match widget type ${widget_type}` };
  }
  if (!catalogEntry.allowedSlots.includes(slot as typeof ALLOWED_AD_SLOTS[number])) {
    return { valid: false, error: `slot is not allowed for widget type ${widget_type}` };
  }
  if (
    typeof consent_category !== 'string' ||
    !ALLOWED_CONSENT_CATEGORIES.includes(consent_category as typeof ALLOWED_CONSENT_CATEGORIES[number])
  ) {
    return { valid: false, error: `consent_category must be one of: ${ALLOWED_CONSENT_CATEGORIES.join(', ')}` };
  }
  if (consent_category !== catalogEntry.defaultConsentCategory) {
    return {
      valid: false,
      error: `consent_category must be ${catalogEntry.defaultConsentCategory} for widget type ${widget_type}`,
    };
  }

  const paramCheck = validateAdPlacementParams(widget_type, params || {});
  if (!paramCheck.valid) {
    return { valid: false, error: paramCheck.error };
  }

  return { valid: true };
}
