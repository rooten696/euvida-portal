export const AFFILIATE_PROJECT: 572910;
export const AFFILIATE_MARKER: 776456;

export type AffiliateLinkRecord = {
  url?: unknown;
  sourceUrl?: unknown;
  subId?: unknown;
} | null | undefined;

export type AffiliateLinkRequest = {
  url: string;
  sub_id: string;
};

export function isSafeProviderUrl(value: unknown): boolean;

export function isValidAffiliateUrl(
  value: unknown,
  expectedSubId: string,
  expectedSourceUrl?: string,
  project?: number,
  marker?: number,
): boolean;

export function reusableAffiliateLink(
  record: AffiliateLinkRecord,
  request: AffiliateLinkRequest,
  project?: number,
  marker?: number,
): boolean;
