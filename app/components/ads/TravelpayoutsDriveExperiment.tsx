'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  isDriveEligibleRoute,
  generateDriveSubId,
  buildDriveScriptUrl,
  parseTravelpayoutsDriveSnippet,
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_GRANTED,
  COOKIE_CONSENT_EVENTS,
} from '@/lib/travelpayouts-drive';

export function hasDriveMarketingConsent(cookieConsentValue?: string | null): boolean {
  return cookieConsentValue === COOKIE_CONSENT_GRANTED;
}

interface DriveReloadDecision {
  driveWasEnabled: boolean;
  routeEligible: boolean;
  hasConsent: boolean;
  pathnameChanged: boolean;
}

/**
 * Once a third-party script has executed, removing its script tag cannot undo
 * listeners or global state. A full document reload is therefore required when
 * consent is revoked, the route leaves the allowlist, or an SPA navigation
 * needs a fresh page URL and marker.
 */
export function shouldReloadDriveDocument({
  driveWasEnabled,
  routeEligible,
  hasConsent,
  pathnameChanged,
}: DriveReloadDecision): boolean {
  return driveWasEnabled && (!routeEligible || !hasConsent || pathnameChanged);
}

interface TravelpayoutsDriveInnerProps {
  scriptSrc: string;
  subId: string;
}

/**
 * Inner widget component enforcing defense-in-depth consent self-check,
 * runtime URL re-validation, controlled script attributes and DOM cleanup.
 */
export function TravelpayoutsDriveInner({ scriptSrc, subId }: TravelpayoutsDriveInnerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Defense in depth: inner component independently verifies marketing consent
    let consent: string | null = null;
    try {
      consent = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    } catch {
      return;
    }

    if (!hasDriveMarketingConsent(consent)) {
      return;
    }

    // Revalidate URL before DOM insertion
    const parsed = parseTravelpayoutsDriveSnippet(scriptSrc);
    if (!parsed.valid) {
      return;
    }

    container.replaceChildren();

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cmp-ab', '2');
    script.setAttribute('data-sub-id', subId);
    script.id = 'travelpayouts-drive-script';
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    script.src = parsed.scriptSrc;

    container.appendChild(script);

    return () => {
      container.replaceChildren();
      if (script.parentNode) {
        script.remove();
      }
    };
  }, [scriptSrc, subId]);

  return <div id="travelpayouts-drive-container" ref={containerRef} data-testid="travelpayouts-drive-container" />;
}

/**
 * Travelpayouts Drive Experiment Component
 *
 * Enforces:
 * - Route eligibility (public articles, regions, and places only; excludes homepage, admin, legal, system)
 * - Strict marketing cookie consent gating (never loads on denied/missing consent)
 * - Zero SSR vendor scripts
 * - Full document purge on consent revocation or client-side route changes after activation
 * - Per-page deterministic SubID without PII
 */
export function TravelpayoutsDriveExperiment() {
  const pathname = usePathname();
  const [canRender, setCanRender] = React.useState(false);
  const driveWasEnabledRef = React.useRef(false);
  const activePathRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const refreshState = () => {
      // 1. Route eligibility check
      const eligibility = isDriveEligibleRoute(pathname || '');
      // 2. Marketing consent check
      let consent: string | null = null;
      try {
        consent = window.localStorage.getItem(COOKIE_CONSENT_KEY);
      } catch {
        // Storage disabled or unavailable
      }

      const hasConsent = hasDriveMarketingConsent(consent);
      const pathnameChanged =
        activePathRef.current !== null && activePathRef.current !== (pathname || '');

      if (
        shouldReloadDriveDocument({
          driveWasEnabled: driveWasEnabledRef.current,
          routeEligible: eligibility.eligible,
          hasConsent,
          pathnameChanged,
        })
      ) {
        window.location.reload();
        return;
      }

      if (!eligibility.eligible || !hasConsent) {
        setCanRender(false);
        return;
      }

      driveWasEnabledRef.current = true;
      activePathRef.current = pathname || '';
      setCanRender(true);
    };

    // Keep SSR and first client mount empty; synchronize after hydration
    const timer = window.setTimeout(refreshState, 0);

    for (const evt of COOKIE_CONSENT_EVENTS) {
      window.addEventListener(evt, refreshState);
    }

    return () => {
      window.clearTimeout(timer);
      for (const evt of COOKIE_CONSENT_EVENTS) {
        window.removeEventListener(evt, refreshState);
      }
    };
  }, [pathname]);

  if (!canRender) {
    return null;
  }

  const eligibility = isDriveEligibleRoute(pathname || '');
  if (!eligibility.eligible || !eligibility.pageType || !eligibility.locale || !eligibility.id) {
    return null;
  }

  const subId = generateDriveSubId({
    locale: eligibility.locale,
    pageType: eligibility.pageType,
    id: eligibility.id,
    placement: 'drive',
  });

  const scriptSrc = buildDriveScriptUrl({ subId });

  return <TravelpayoutsDriveInner scriptSrc={scriptSrc} subId={subId} />;
}

export default TravelpayoutsDriveExperiment;
