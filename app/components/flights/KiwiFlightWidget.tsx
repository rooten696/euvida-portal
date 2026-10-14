'use client';

import React, { useEffect, useRef, useState } from 'react';

export const DEFAULT_TRAVELPAYOUTS_KIWI_SNIPPET =
  '<script async src="https://tpwgt.com/content?currency=eur&trs=572910&shmarker=776456&locale=en&powered_by=true&limit=4&primary_color=00AE98&results_background_color=FFFFFF&form_background_color=FFFFFF&campaign_id=111&promo_id=3411" charset="utf-8"></script>';

export const KIWI_AFFILIATE_DIRECT_URL =
  'https://tp.media/r?marker=776456&trs=572910&p=3411&u=https%3A%2F%2Fwww.kiwi.com';

const KIWI_LOCALE_MAP: Record<string, string> = {
  cs: 'cz',
  en: 'en',
  de: 'de',
  fr: 'fr',
  es: 'es',
};

const KIWI_CURRENCY_MAP: Record<string, string> = {
  cs: 'czk',
  en: 'eur',
  de: 'eur',
  fr: 'eur',
  es: 'eur',
};

export function buildKiwiWidgetUrl(locale: string = 'cs'): string {
  const normLocale = locale.toLowerCase().slice(0, 2);
  const kiwiLang = KIWI_LOCALE_MAP[normLocale] || 'en';
  const kiwiCurrency = KIWI_CURRENCY_MAP[normLocale] || 'eur';

  const params = new URLSearchParams({
    currency: kiwiCurrency,
    trs: '572910',
    shmarker: '776456',
    locale: kiwiLang,
    powered_by: 'true',
    limit: '4',
    primary_color: '00AE98',
    results_background_color: 'FFFFFF',
    form_background_color: 'FFFFFF',
    campaign_id: '111',
    promo_id: '3411',
  });

  return `https://tpwgt.com/content?${params.toString()}`;
}

const copyByLocale = {
  cs: {
    loading: 'Načítání vyhledávače letenek Kiwi.com…',
    directCtaTitle: 'Přejít přímo na Kiwi.com',
    directCtaDesc:
      'Hledáte specifické kombinace, nízkonákladové spoje nebo chcete dokončit rezervaci přímo u partnera?',
    directCtaButton: 'Otevřít Kiwi.com s garancí přestupů →',
    opensInNewTab: '(otevře se v novém okně)',
    insecureNotice:
      'Upozornění pro lokální vývoj: Prohlížeč běží na nezabezpečené IP adrese (HTTP), kde moderní prohlížeče blokují Web Crypto API potřebné pro externí Kiwi iframe. Na ostré doméně s HTTPS (euvida.eu) i na http://localhost běží interaktivní vyhledávač plně funkční.',
    adblockNotice:
      'Vyhledávač se nepodařilo načíst. Může být blokován doplňkem pro blokování reklam nebo přísným zabezpečením prohlížeče. Můžete využít přímé vyhledávání níže.',
    consentRequiredTitle: 'Interaktivní vyhledávač letenek Kiwi.com',
    consentRequiredDesc:
      'Vyhledávač načítá externí skript a měřicí kód partnera Travelpayouts / Kiwi.com pro automatickou detekci letiště a zobrazení nejvýhodnějších cen letenek.',
    enableWidgetButton: 'Povolit a načíst vyhledávač letenek',
    orDirectSearch: 'Nebo hledat přímo:',
    affiliateDisclosure:
      'Transparentnost a partnerství: Euvida.eu spolupracuje se společností Kiwi.com v rámci partnerského programu Travelpayouts. Proklikem a případným nákupem letenky podpoříte provoz tohoto portálu bez jakéhokoliv navýšení vaší konečné ceny.',
  },
  en: {
    loading: 'Loading Kiwi.com flight search…',
    directCtaTitle: 'Go directly to Kiwi.com',
    directCtaDesc:
      'Looking for specific connections, low-cost flights or want to complete your booking directly?',
    directCtaButton: 'Open Kiwi.com with transfer guarantee →',
    opensInNewTab: '(opens in a new window)',
    insecureNotice:
      'Local development notice: Running over insecure HTTP IP where modern browsers block Web Crypto API required for Kiwi iframe. On production HTTPS (euvida.eu) and on http://localhost the interactive widget works fully.',
    adblockNotice:
      'Unable to load the search widget. It might be blocked by an ad-blocker or strict browser settings. You can use direct search below.',
    consentRequiredTitle: 'Interactive Kiwi.com Flight Search',
    consentRequiredDesc:
      'The flight widget loads external scripts from partner Travelpayouts / Kiwi.com for nearest airport detection and dynamic flight fares.',
    enableWidgetButton: 'Enable and load flight search',
    orDirectSearch: 'Or search directly:',
    affiliateDisclosure:
      'Affiliate disclosure: Euvida.eu partners with Kiwi.com via Travelpayouts. When booking through our links, we may receive a commission at no additional cost to you.',
  },
  de: {
    loading: 'Kiwi.com Flugsuche wird geladen…',
    directCtaTitle: 'Direkt zu Kiwi.com',
    directCtaDesc:
      'Suchen Sie nach spezifischen Verbindungen oder möchten Sie direkt beim Partner buchen?',
    directCtaButton: 'Kiwi.com mit Umsteigegarantie öffnen →',
    opensInNewTab: '(öffnet in neuem Fenster)',
    insecureNotice:
      'Hinweis für lokale Entwicklung: Über ungesichertes HTTP blockieren moderne Browser das für das Kiwi-Iframe erforderliche Web Crypto API. Auf der HTTPS-Produktionsdomain (euvida.eu) und auf http://localhost läuft das Widget voll funktionsfähig.',
    adblockNotice:
      'Die Flugsuche konnte nicht geladen werden (möglicherweise durch einen Werbeblocker blockiert). Bitte nutzen Sie die direkte Suche unten.',
    consentRequiredTitle: 'Interaktive Kiwi.com Flugsuche',
    consentRequiredDesc:
      'Das Widget lädt Skripte unseres Partners Travelpayouts / Kiwi.com zur automatischen Erkennung des Abflughafens und zur Tarifanzeige.',
    enableWidgetButton: 'Aktivieren und Flugsuche laden',
    orDirectSearch: 'Oder direkt suchen:',
    affiliateDisclosure:
      'Transparenz & Partnerschaft: Euvida.eu arbeitet mit Kiwi.com über Travelpayouts zusammen. Bei Buchungen über unsere Links erhalten wir möglicherweise eine Provision ohne Mehrkosten für Sie.',
  },
  fr: {
    loading: 'Chargement du comparateur de vols Kiwi.com…',
    directCtaTitle: 'Accéder directement à Kiwi.com',
    directCtaDesc:
      'Vous cherchez des correspondances spécifiques ou souhaitez finaliser votre réservation ?',
    directCtaButton: 'Ouvrir Kiwi.com avec correspondance garantie →',
    opensInNewTab: '(s’ouvre dans une nouvelle fenêtre)',
    insecureNotice:
      'Note de développement local : En HTTP non sécurisé, les navigateurs bloquent l’API Web Crypto requise par Kiwi. Sur le domaine HTTPS en production (euvida.eu) et sur http://localhost, le widget fonctionne parfaitement.',
    adblockNotice:
      'Impossible de charger le moteur de recherche (probablement bloqué par un bloqueur de publicités). Utilisez la recherche directe ci-dessous.',
    consentRequiredTitle: 'Comparateur interactif de vols Kiwi.com',
    consentRequiredDesc:
      'Le widget charge des scripts de notre partenaire Travelpayouts / Kiwi.com pour détecter votre aéroport et comparer les tarifs.',
    enableWidgetButton: 'Activer et charger le comparateur',
    orDirectSearch: 'Ou rechercher directement :',
    affiliateDisclosure:
      'Transparence et partenariat : Euvida.eu collabore avec Kiwi.com via Travelpayouts. Si vous réservez via nos liens, nous pouvons percevoir une commission sans surcoût pour vous.',
  },
  es: {
    loading: 'Cargando buscador de vuelos Kiwi.com…',
    directCtaTitle: 'Ir directamente a Kiwi.com',
    directCtaDesc:
      '¿Buscas conexiones específicas o deseas completar tu reserva directamente con nuestro socio?',
    directCtaButton: 'Abrir Kiwi.com con garantía de conexión →',
    opensInNewTab: '(se abre en una ventana nueva)',
    insecureNotice:
      'Aviso de desarrollo local: En HTTP no seguro los navegadores bloquean la API Web Crypto requerida por Kiwi. En producción con HTTPS (euvida.eu) y en http://localhost el buscador interactivo funciona perfectamente.',
    adblockNotice:
      'No se pudo cargar el buscador (posiblemente bloqueado por un bloqueador de anuncios). Puedes utilizar la búsqueda directa abajo.',
    consentRequiredTitle: 'Buscador interactivo de vuelos Kiwi.com',
    consentRequiredDesc:
      'El widget carga scripts del socio Travelpayouts / Kiwi.com para la detección automática del aeropuerto y tarifas actualizadas.',
    enableWidgetButton: 'Permitir y cargar buscador de vuelos',
    orDirectSearch: 'O buscar directamente:',
    affiliateDisclosure:
      'Transparencia y afiliación: Euvida.eu colabora con Kiwi.com a través de Travelpayouts. Si reservas a través de nuestros enlaces, podemos percibir una pequeña comisión sin coste adicional para ti.',
  },
};

export interface KiwiFlightWidgetProps {
  locale?: string;
  className?: string;
  exactScriptSrc?: string;
}

export default function KiwiFlightWidget({
  locale = 'cs',
  className = '',
  exactScriptSrc,
}: KiwiFlightWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInsecureDev, setIsInsecureDev] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasScriptError, setHasScriptError] = useState(false);
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);

  const normLocale = (['cs', 'en', 'de', 'fr', 'es'].includes(locale)
    ? locale
    : 'cs') as keyof typeof copyByLocale;
  const t = copyByLocale[normLocale];

  const scriptSrc = exactScriptSrc || buildKiwiWidgetUrl(locale);

  // Check consent and insecure context safely after hydration
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const isLocalInsecure =
          !window.isSecureContext &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1';
        setIsInsecureDev(isLocalInsecure);

        try {
          const consent = localStorage.getItem('cookie_consent');
          // If explicitly denied, do not auto-load; if granted, allow
          setHasConsent(consent === 'granted');
        } catch {
          setHasConsent(false);
        }
      }
    }, 10);

    const onConsentChange = () => {
      try {
        const consent = localStorage.getItem('cookie_consent');
        setHasConsent(consent === 'granted');
      } catch {
        setHasConsent(false);
      }
    };

    window.addEventListener('euvida:cookie-consent', onConsentChange);
    window.addEventListener('cookie_consent_updated', onConsentChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('euvida:cookie-consent', onConsentChange);
      window.removeEventListener('cookie_consent_updated', onConsentChange);
    };
  }, []);

  const handleGrantConsent = () => {
    try {
      localStorage.setItem('cookie_consent', 'granted');
      window.dispatchEvent(new Event('euvida:cookie-consent'));
      window.dispatchEvent(new Event('cookie_consent_updated'));
    } catch {
      // Ignore
    }
    setHasConsent(true);
  };

  useEffect(() => {
    if (hasConsent !== true) return;

    const container = containerRef.current;
    if (!container) return;

    container.replaceChildren();
    setIsLoading(true);
    setHasScriptError(false);

    let loadTimeout: ReturnType<typeof setTimeout> | null = null;
    let failsafeTimeout: ReturnType<typeof setTimeout> | null = null;

    const script = document.createElement('script');
    script.async = true;
    script.charset = 'utf-8';
    script.src = scriptSrc;

    script.onload = () => {
      loadTimeout = setTimeout(() => setIsLoading(false), 800);
    };

    script.onerror = () => {
      setIsLoading(false);
      setHasScriptError(true);
    };

    container.appendChild(script);

    failsafeTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 4500);

    return () => {
      if (loadTimeout) clearTimeout(loadTimeout);
      if (failsafeTimeout) clearTimeout(failsafeTimeout);
      container.replaceChildren();
    };
  }, [hasConsent, scriptSrc]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dev warning only when testing over plain HTTP IP address */}
      {isInsecureDev && (
        <div
          role="status"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 backdrop-blur-md"
        >
          <div className="flex items-start gap-2.5">
            <span className="text-base leading-none">⚠️</span>
            <div className="space-y-1">
              <p className="font-semibold">{t.insecureNotice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Kiwi Widget Container */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white p-4 shadow-2xl sm:p-6 md:p-8">
        {/* Consent prompt if user has not granted optional cookies */}
        {hasConsent === false && (
          <div className="flex min-h-[380px] flex-col items-center justify-center p-6 text-center space-y-4 rounded-2xl bg-slate-900 text-slate-100">
            <div className="text-4xl">✈️</div>
            <h3 className="text-lg font-black text-white sm:text-xl">
              {t.consentRequiredTitle}
            </h3>
            <p className="max-w-md text-xs sm:text-sm text-slate-400 leading-relaxed">
              {t.consentRequiredDesc}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleGrantConsent}
                className="rounded-xl bg-emerald-500 px-6 py-3 text-xs sm:text-sm font-extrabold text-slate-950 shadow-md hover:bg-emerald-400 transition-all hover:scale-105"
              >
                {t.enableWidgetButton}
              </button>
              <span className="text-xs text-slate-500">{t.orDirectSearch}</span>
              <a
                href={KIWI_AFFILIATE_DIRECT_URL}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
              >
                Kiwi.com {t.opensInNewTab}
              </a>
            </div>
          </div>
        )}

        {/* Script loading failure / Adblock warning */}
        {hasConsent === true && hasScriptError && (
          <div className="flex min-h-[360px] flex-col items-center justify-center p-6 text-center space-y-4 rounded-2xl bg-amber-50 text-amber-900">
            <div className="text-3xl">🛡️</div>
            <p className="max-w-md text-xs sm:text-sm font-medium leading-relaxed">
              {t.adblockNotice}
            </p>
            <a
              href={KIWI_AFFILIATE_DIRECT_URL}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex rounded-xl bg-emerald-600 px-6 py-3 text-xs sm:text-sm font-extrabold text-white shadow-md hover:bg-emerald-500 transition-all"
            >
              {t.directCtaButton}
            </a>
          </div>
        )}

        {/* Loading skeleton placeholder overlay */}
        {hasConsent === true && isLoading && !hasScriptError && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-3 rounded-2xl bg-slate-50 text-slate-500 backdrop-blur-sm"
          >
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-sm font-medium animate-pulse">{t.loading}</p>
          </div>
        )}

        {/* DOM node where Travelpayouts script injects widget (stays sized so Kiwi measures correctly) */}
        <div
          ref={containerRef}
          data-testid="kiwi-widget-holder"
          className="min-h-[420px] w-full"
        />
      </div>

      {/* Direct Partner Action Card & Fallback */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md sm:flex-row sm:p-8">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-base font-bold text-white sm:text-lg">
            ✈️ {t.directCtaTitle}
          </h3>
          <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
            {t.directCtaDesc}
          </p>
        </div>
        <a
          href={KIWI_AFFILIATE_DIRECT_URL}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 hover:bg-emerald-400"
        >
          {t.directCtaButton}
          <span className="sr-only"> {t.opensInNewTab}</span>
        </a>
      </div>

      {/* Affiliate transparency disclosure */}
      <p className="text-center text-[11px] leading-relaxed text-slate-500 max-w-2xl mx-auto">
        {t.affiliateDisclosure}
      </p>
    </div>
  );
}
