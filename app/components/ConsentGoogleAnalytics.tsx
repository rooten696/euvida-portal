'use client';

import { useEffect, useState } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { readCookiePreferences, updateGoogleConsent } from '@/lib/cookie-consent';

/** Basic consent mode: do not fetch Google's scripts before an explicit opt-in. */
export default function ConsentGoogleAnalytics({ gaId }: { gaId: string }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const preferences = readCookiePreferences();
      const granted = preferences.analytics;
      // Unmounting next/script alone cannot stop a tag that is already running.
      (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = !granted;
      updateGoogleConsent(granted, preferences.marketing);
      setAllowed(granted);
    };
    const timer = setTimeout(refresh, 10);
    window.addEventListener('euvida:cookie-consent', refresh);
    window.addEventListener('cookie_consent_updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('euvida:cookie-consent', refresh);
      window.removeEventListener('cookie_consent_updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [gaId]);

  return allowed ? <GoogleAnalytics gaId={gaId} /> : null;
}
