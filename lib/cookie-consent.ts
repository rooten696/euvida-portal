export type CookiePreferences = { analytics: boolean; marketing: boolean; decided: boolean };

// Only a complete successful save may clear this current-document safety latch.
// It is NOT persistent withdrawal: blocked storage can retain grants across reloads.
let persistenceFailed = false;

export function hasCookiePersistenceFailure(): boolean {
  return persistenceFailed;
}

export function saveCookiePreferences(analytics: boolean, marketing: boolean): void {
  try {
    window.localStorage.setItem('cookie_analytics_consent', analytics ? 'granted' : 'denied');
    window.localStorage.setItem('cookie_consent', marketing ? 'granted' : 'denied');
    persistenceFailed = false;
  } catch {
    // Set before notifying any readers, even when old grants remain readable.
    persistenceFailed = true;
    for (const key of ['cookie_analytics_consent', 'cookie_consent']) {
      try { window.localStorage.removeItem(key); } catch { /* The runtime denial remains authoritative. */ }
    }
  }
}

/** Keep the existing partner-consent key and respect valid choices made before this dialog existed. */
export function readCookiePreferences(): CookiePreferences {
  if (persistenceFailed) return { analytics: false, marketing: false, decided: true };
  try {
    const marketing = window.localStorage.getItem('cookie_consent');
    const analytics = window.localStorage.getItem('cookie_analytics_consent') ?? marketing;
    const valid = (value: string | null) => value === 'granted' || value === 'denied';
    return { analytics: analytics === 'granted', marketing: marketing === 'granted', decided: valid(marketing) && valid(analytics) };
  } catch {
    // Privacy mode or blocked storage must never imply consent or break the dialog.
    return { analytics: false, marketing: false, decided: false };
  }
}

export function updateGoogleConsent(analytics: boolean, marketing: boolean) {
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.('consent', 'update', {
    ad_storage: marketing ? 'granted' : 'denied',
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  });
}
