'use client';

import { useState, useEffect } from 'react';

function updateGoogleConsent(granted: boolean) {
  if (typeof window === 'undefined') return;
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.('consent', 'update', {
    ad_storage: granted ? 'granted' : 'denied',
    analytics_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    ad_personalization: granted ? 'granted' : 'denied',
  });
}

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Timeout (i když jen 10 ms) přesune kontrolu až na konec fronty.
    // Tím vyřešíme chybu linteru a zamezíme zbytečnému dvojitému renderování.
    const timer = setTimeout(() => {
      const consent = localStorage.getItem('cookie_consent');
      updateGoogleConsent(consent === 'granted');
      if (!consent) {
        setShowBanner(true);
      }
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'granted');
    updateGoogleConsent(true);
    setShowBanner(false);
    // Refreshne stránku, aby mohl naskočit Google Analytics
    window.location.reload(); 
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'denied');
    updateGoogleConsent(false);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-[100] md:max-w-md md:left-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-3xl">🍪</span>
          <h3 className="font-bold text-blue-900 text-lg">Cookies & Soukromí</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Pomozte nám vylepšit EUVIDA. Používáme cookies, abychom pochopili, co vás zajímá, a mohli web dále rozvíjet.
        </p>
        <div className="flex gap-3">
          <button 
            onClick={handleAccept}
            className="flex-grow bg-blue-900 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition-all text-sm"
          >
            Povolit vše
          </button>
          <button 
            onClick={handleDecline}
            className="px-4 py-3 text-gray-400 hover:text-gray-600 font-bold text-sm transition-colors"
          >
            Odmítnout
          </button>
        </div>
      </div>
    </div>
  );
}
