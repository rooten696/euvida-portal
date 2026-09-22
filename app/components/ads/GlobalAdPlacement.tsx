'use client';

import React from 'react';
import type { SupportedLocale, AdPlacement, AdConsentCategory } from '@/lib/articleTypes';
import {
  type AdPlacementSlot,
  validateAdPlacementParams,
  isAllowlistedAdHost,
  parseTravelpayoutsWidgetSnippet,
} from '@/lib/ad-placement-catalog';
import { isPlacementPubliclyVisible } from '@/lib/affiliateOffers';

export function hasConsentForPlacement(
  consentCategory: AdConsentCategory,
  cookieConsentValue?: string | null
): boolean {
  if (consentCategory === 'functional') return true;
  return cookieConsentValue === 'granted';
}

export interface GlobalAdPlacementProps {
  placement?: AdPlacement | null;
  locale: SupportedLocale;
  className?: string;
  slot?: AdPlacementSlot;
}

function TravelpayoutsScriptWidget({
  scriptSrc,
  slot,
  consentCategory,
  className,
}: {
  scriptSrc: string;
  slot: AdPlacementSlot;
  consentCategory: AdConsentCategory;
  className: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const parsed = parseTravelpayoutsWidgetSnippet(scriptSrc);
    const container = containerRef.current;
    if (!parsed.valid || !container) return;

    let consent: string | null = null;
    try {
      consent = window.localStorage.getItem('cookie_consent');
    } catch {
      return;
    }
    if (!hasConsentForPlacement(consentCategory, consent)) return;

    container.replaceChildren();
    const script = document.createElement('script');
    script.async = true;
    script.src = parsed.scriptSrc;
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    container.appendChild(script);

    return () => container.replaceChildren();
  }, [consentCategory, scriptSrc]);

  return (
    <aside
      data-ad-slot={slot}
      data-provider="travelpayouts"
      data-consent={consentCategory}
      data-widget-type="travelpayouts_script_widget"
      className={`my-4 min-h-16 overflow-hidden ${className}`}
    >
      <div ref={containerRef} />
    </aside>
  );
}

export function GlobalAdPlacementContent({
  placement,
  locale,
  className = '',
  slot: requestedSlot,
}: GlobalAdPlacementProps) {
  // Fail closed if placement is missing or not publicly visible
  if (!placement || !isPlacementPubliclyVisible(placement)) {
    return null;
  }


  const slot = requestedSlot || placement.slot;
  if (requestedSlot && placement.slot !== requestedSlot) {
    return null;
  }

  // Validate parameters against developer-maintained catalog
  const validation = validateAdPlacementParams(placement.widget_type, placement.params);
  if (!validation.valid) {
    return null;
  }

  const params = placement.params;

  if (placement.widget_type === 'travelpayouts_script_widget') {
    const parsed = parseTravelpayoutsWidgetSnippet(String(params.script_src || ''));
    if (!parsed.valid) return null;

    return (
      <TravelpayoutsScriptWidget
        scriptSrc={parsed.scriptSrc}
        slot={slot}
        consentCategory={placement.consent_category}
        className={className}
      />
    );
  }

  // Render internal promotional card/banner
  if (placement.widget_type === 'internal_promo') {
    const titleObj = params.title as Record<string, string> | undefined;
    const descObj = params.description as Record<string, string> | undefined;
    const ctaObj = params.cta as Record<string, string> | undefined;
    const targetPath = String(params.target_path || '/');

    const title = titleObj?.[locale] || titleObj?.['cs'] || '';
    const description = descObj?.[locale] || descObj?.['cs'] || '';
    const cta = ctaObj?.[locale] || ctaObj?.['cs'] || 'Více informací';

    if (!title) return null;

    const href = targetPath.startsWith('/') ? `/${locale}${targetPath}` : targetPath;

    return (
      <aside
        data-ad-slot={slot}
        data-provider="internal"
        data-consent={placement.consent_category}
        className={`my-4 overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-slate-100 md:p-5 ${className}`}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h4 className="text-base font-bold text-emerald-400">{title}</h4>
            {description && <p className="mt-1 text-xs text-slate-300 md:text-sm">{description}</p>}
          </div>
          <a
            href={href}
            className="mt-2 inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 md:mt-0"
          >
            {cta}
          </a>
        </div>
      </aside>
    );
  }

  // Render Travelpayouts banner (safe declarative <a> tag, no arbitrary scripts)
  if (placement.widget_type === 'travelpayouts_banner') {
    const url = String(params.url || '');
    if (!isAllowlistedAdHost(url)) return null;

    const title = String(params.title || 'Doporučená nabídka partnera');
    const label = String(params.label || 'Otevřít nabídku');

    return (
      <aside
        data-ad-slot={slot}
        data-provider="travelpayouts"
        data-consent={placement.consent_category}
        className={`my-4 rounded-xl border border-slate-700/50 bg-slate-900/80 p-4 ${className}`}
      >
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Partner
            </span>
            <p className="mt-0.5 text-sm font-semibold text-white">{title}</p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
          >
            <span>{label}</span>
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </aside>
    );
  }

  // Render Travelpayouts search widget (declarative link to safe allowlisted host)
  if (placement.widget_type === 'travelpayouts_search_widget') {
    const domain = String(params.domain || 'whitelabel.travelpayouts.com');
    const searchUrl = `https://${domain}/search?marker=${encodeURIComponent(String(params.marker || '776456'))}`;
    if (!isAllowlistedAdHost(searchUrl)) return null;

    return (
      <aside
        data-ad-slot={slot}
        data-provider="travelpayouts"
        data-consent={placement.consent_category}
        className={`my-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 ${className}`}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-300">
            Hledáte letenky nebo ubytování?
          </p>
          <a
            href={searchUrl}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            Vyhledat
          </a>
        </div>
      </aside>
    );
  }

  // Fail closed for any unhandled widget type
  return null;
}

export default function GlobalAdPlacement(props: GlobalAdPlacementProps) {
  const [canRender, setCanRender] = React.useState(false);

  React.useEffect(() => {
    const placement = props.placement;
    let expiryTimer: number | undefined;

    const refreshVisibility = () => {
      if (!placement || !isPlacementPubliclyVisible(placement, new Date())) {
        setCanRender(false);
        return;
      }

      let consent: string | null = null;
      try {
        consent = window.localStorage.getItem('cookie_consent');
      } catch {
        // Storage may be disabled. Marketing/statistics must remain fail-closed.
      }
      setCanRender(hasConsentForPlacement(placement.consent_category, consent));
    };

    // Keep the server and first client render empty. Reveal only after hydration,
    // preventing both consent mismatches and stale ISR ad markup.
    const mountTimer = window.setTimeout(refreshVisibility, 0);
    window.addEventListener('storage', refreshVisibility);
    window.addEventListener('euvida:cookie-consent', refreshVisibility);

    if (placement?.end_at) {
      const delay = new Date(placement.end_at).getTime() - Date.now();
      if (delay > 0) {
        expiryTimer = window.setTimeout(refreshVisibility, Math.min(delay + 25, 2_147_483_647));
      }
    }

    return () => {
      window.clearTimeout(mountTimer);
      if (expiryTimer !== undefined) window.clearTimeout(expiryTimer);
      window.removeEventListener('storage', refreshVisibility);
      window.removeEventListener('euvida:cookie-consent', refreshVisibility);
    };
  }, [props.placement]);

  if (!canRender) return null;
  return <GlobalAdPlacementContent {...props} />;
}
