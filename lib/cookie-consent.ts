export type CookiePreferences = { analytics: boolean; marketing: boolean; videos: boolean; decided: boolean };

// Only a complete successful save may clear this current-document safety latch.
// It is NOT persistent withdrawal: blocked storage can retain grants across reloads.
let persistenceFailed = false;

export function hasCookiePersistenceFailure(): boolean {
  return persistenceFailed;
}

export function saveCookiePreferences(analytics: boolean, marketing: boolean, videos = false): void {
  try {
    window.localStorage.setItem('cookie_analytics_consent', analytics ? 'granted' : 'denied');
    window.localStorage.setItem('cookie_consent', marketing ? 'granted' : 'denied');
    window.localStorage.setItem('cookie_video_consent', videos ? 'granted' : 'denied');
    persistenceFailed = false;
  } catch {
    // Set before notifying any readers, even when old grants remain readable.
    persistenceFailed = true;
    for (const key of ['cookie_analytics_consent', 'cookie_consent', 'cookie_video_consent']) {
      try { window.localStorage.removeItem(key); } catch { /* The runtime denial remains authoritative. */ }
    }
  }
}

/** Preserve existing analytics/partner choices; a newly disclosed video purpose needs its own decision. */
export function readCookiePreferences(): CookiePreferences {
  if (persistenceFailed) return { analytics: false, marketing: false, videos: false, decided: true };
  try {
    const marketing = window.localStorage.getItem('cookie_consent');
    const analytics = window.localStorage.getItem('cookie_analytics_consent') ?? marketing;
    const videos = window.localStorage.getItem('cookie_video_consent');
    const valid = (value: string | null) => value === 'granted' || value === 'denied';
    return { analytics: analytics === 'granted', marketing: marketing === 'granted', videos: videos === 'granted', decided: valid(marketing) && valid(analytics) && valid(videos) };
  } catch {
    // Privacy mode or blocked storage must never imply consent or break the dialog.
    return { analytics: false, marketing: false, videos: false, decided: false };
  }
}

export function hasVideoConsent(): boolean {
  return readCookiePreferences().videos;
}

export function subscribeCookiePreferences(onChange: () => void): () => void {
  const events = ['euvida:cookie-consent', 'cookie_consent_updated', 'storage'];
  for (const event of events) window.addEventListener(event, onChange);
  return () => { for (const event of events) window.removeEventListener(event, onChange); };
}

export function openCookieSettings(): void {
  window.dispatchEvent(new Event('euvida:open-cookie-settings'));
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
