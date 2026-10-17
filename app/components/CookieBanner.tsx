'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { readCookiePreferences, saveCookiePreferences, updateGoogleConsent } from '@/lib/cookie-consent';

const copy = {
  cs: {
    title: 'Cookies a soukromí', settings: 'Nastavení cookies', close: 'Zavřít',
    description: 'Nezbytné cookies zajišťují fungování webu. Volitelné cookies pro Google Analytics a partnerské služby povolíme pouze s vaším souhlasem.',
    accept: 'Přijmout vše', reject: 'Odmítnout volitelné', customize: 'Přizpůsobit', save: 'Uložit výběr',
    optional: 'Volitelné cookies', analytics: 'Google Analytics — měření návštěvnosti', marketing: 'Partnerské služby a marketing',
  },
  en: {
    title: 'Cookies and privacy', settings: 'Cookie settings', close: 'Close',
    description: 'Essential cookies keep the site working. Optional cookies for Google Analytics and partner services are enabled only with your consent.',
    accept: 'Accept all', reject: 'Reject optional', customize: 'Customize', save: 'Save choices',
    optional: 'Optional cookies', analytics: 'Google Analytics — audience measurement', marketing: 'Partner services and marketing',
  },
  de: {
    title: 'Cookies und Datenschutz', settings: 'Cookie-Einstellungen', close: 'Schließen',
    description: 'Notwendige Cookies sichern die Funktion der Website. Optionale Cookies für Google Analytics und Partnerdienste aktivieren wir nur mit Ihrer Einwilligung.',
    accept: 'Alle akzeptieren', reject: 'Optionale ablehnen', customize: 'Anpassen', save: 'Auswahl speichern',
    optional: 'Optionale Cookies', analytics: 'Google Analytics — Reichweitenmessung', marketing: 'Partnerdienste und Marketing',
  },
  fr: {
    title: 'Cookies et confidentialité', settings: 'Paramètres des cookies', close: 'Fermer',
    description: 'Les cookies essentiels assurent le fonctionnement du site. Les cookies facultatifs de Google Analytics et des services partenaires ne sont activés qu’avec votre consentement.',
    accept: 'Tout accepter', reject: 'Refuser les cookies facultatifs', customize: 'Personnaliser', save: 'Enregistrer mes choix',
    optional: 'Cookies facultatifs', analytics: 'Google Analytics — mesure d’audience', marketing: 'Services partenaires et marketing',
  },
  es: {
    title: 'Cookies y privacidad', settings: 'Configuración de cookies', close: 'Cerrar',
    description: 'Las cookies esenciales permiten que el sitio funcione. Las cookies opcionales de Google Analytics y los servicios de socios solo se activan con tu consentimiento.',
    accept: 'Aceptar todas', reject: 'Rechazar opcionales', customize: 'Personalizar', save: 'Guardar selección',
    optional: 'Cookies opcionales', analytics: 'Google Analytics — medición de audiencia', marketing: 'Servicios de socios y marketing',
  },
};


const choiceClass = 'rounded-xl border border-slate-500 bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export default function CookieBanner() {
  const locale = useLocale();
  const text = copy[locale as keyof typeof copy] ?? copy.cs;
  const [showBanner, setShowBanner] = useState(false);
  const [hasDecision, setHasDecision] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const preferences = readCookiePreferences();
      setAnalytics(preferences.analytics);
      setMarketing(preferences.marketing);
      updateGoogleConsent(preferences.analytics, preferences.marketing);
      setHasDecision(preferences.decided);
      if (!preferences.decided) setShowBanner(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showBanner && !dialog.current?.open) dialog.current?.showModal();
    if (!showBanner && dialog.current?.open) dialog.current.close();
  }, [showBanner]);

  const choose = (analytics: boolean, marketing: boolean) => {
    saveCookiePreferences(analytics, marketing);
    ({ analytics, marketing } = readCookiePreferences());
    setAnalytics(analytics);
    setMarketing(marketing);
    updateGoogleConsent(analytics, marketing);
    window.dispatchEvent(new Event('euvida:cookie-consent'));
    window.dispatchEvent(new Event('cookie_consent_updated'));
    setHasDecision(true);
    setShowBanner(false);
    setCustomize(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const preferences = readCookiePreferences();
          setAnalytics(preferences.analytics);
          setMarketing(preferences.marketing);
          setCustomize(false);
          setShowBanner(true);
        }}
        className="fixed bottom-4 left-4 z-50 rounded-full border border-white/10 bg-slate-900/90 px-4 py-2 text-xs font-semibold text-slate-300 shadow-lg hover:text-white"
        aria-haspopup="dialog"
      >
        {text.settings}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="cookie-title"
        aria-describedby="cookie-description"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            'button, input, select, textarea, a[href], [tabindex]',
          )).filter((element) => element.tabIndex >= 0 && !element.matches(':disabled')
            && element.getClientRects().length > 0
            && !['hidden', 'collapse'].includes(window.getComputedStyle(element).visibility));
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = event.currentTarget.ownerDocument.activeElement;
          // Native modal inertness does not stop Tab from reaching browser chrome.
          if (first && last && (event.shiftKey ? active === first : active === last)) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          if (hasDecision) setShowBanner(false);
        }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 p-5 text-slate-100 shadow-2xl backdrop:bg-black/50"
      >
        <h2 id="cookie-title" className="mb-3 text-lg font-semibold">{text.title}</h2>
        <p id="cookie-description" className="mb-4 text-sm leading-relaxed text-slate-300">
          {text.description}
        </p>
        {customize && (
          <fieldset className="mb-4 space-y-3 text-sm">
            <legend className="mb-2 font-semibold">{text.optional}</legend>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" name="analytics" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
              {text.analytics}
            </label>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" name="marketing" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} />
              {text.marketing}
            </label>
          </fieldset>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => choose(true, true)} className="rounded-xl border border-emerald-700 bg-emerald-700 px-4 py-3 text-sm font-semibold text-[#fff] hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500">{text.accept}</button>
          <button type="button" onClick={() => choose(false, false)} className={choiceClass}>{text.reject}</button>
          {customize ? (
            <button type="button" onClick={() => choose(analytics, marketing)} className={`${choiceClass} sm:col-span-2`}>{text.save}</button>
          ) : (
            <button type="button" onClick={() => setCustomize(true)} className={`${choiceClass} sm:col-span-2`}>{text.customize}</button>
          )}
        </div>
        {hasDecision && (
          <button type="button" onClick={() => setShowBanner(false)} className="mt-3 min-h-11 w-full rounded-xl text-sm text-slate-300 underline focus-visible:outline-2 focus-visible:outline-white">
            {text.close}
          </button>
        )}
      </dialog>
    </>
  );
}
