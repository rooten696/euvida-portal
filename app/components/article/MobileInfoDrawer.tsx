'use client';

import { useState, useEffect } from 'react';
import PricesSection from './PricesSection';
import AccessSection from './AccessSection';
import PracticalInfoGrid from './PracticalInfoGrid';
import { getArticleLabel } from '@/lib/articleLabels';
import type { PracticalInfoLocales, PricesInfo, AccessInfo, SupportedLocale } from '@/lib/articleTypes';

type MobileInfoDrawerProps = {
  locale: string;
  practicalInfo?: PracticalInfoLocales | null;
  pricesInfo?: PricesInfo | null;
  accessInfo?: AccessInfo | null;
};

const labels: Record<string, Record<string, string>> = {
  cs: {
    title: 'Bližší info',
  },
  en: {
    title: 'More info',
  },
  de: {
    title: 'Mehr Infos',
  },
  fr: {
    title: "Plus d'infos",
  },
  es: {
    title: 'Más información',
  },
};

export default function MobileInfoDrawer({
  locale,
  practicalInfo,
  pricesInfo,
  accessInfo,
}: MobileInfoDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'prices' | 'practical' | 'access' | null>(null);

  const lang = (labels[locale] ? locale : 'cs') as SupportedLocale;
  const t = labels[lang];

  // Helper checks to see if we have actual content
  const hasPrices = Boolean(pricesInfo);
  const hasPractical = Boolean(practicalInfo && Object.keys(practicalInfo).length > 0);
  const hasAccess = Boolean(accessInfo);

  // If there's no info to show, don't render anything
  if (!hasPrices && !hasPractical && !hasAccess) {
    return null;
  }

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleSection = (section: 'prices' | 'practical' | 'access') => {
    setActiveTab(prev => (prev === section ? null : section));
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            setIsOpen(true);
            // Auto-expand the first available section
            if (hasPrices) setActiveTab('prices');
            else if (hasPractical) setActiveTab('practical');
            else if (hasAccess) setActiveTab('access');
          }
        }}
        className={`fixed bottom-6 right-6 lg:hidden flex items-center gap-2 rounded-full text-slate-950 font-black px-5 py-3.5 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 ${
          isOpen ? 'bg-emerald-500 hover:bg-emerald-400 z-[110]' : 'bg-emerald-500 hover:bg-emerald-400 z-40'
        }`}
        aria-label={t.title}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.39.43 1.001.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.276 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527a1.125 1.125 0 0 1-1.448-.12l-.774-.772a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        )}
        {t.title}
      </button>

      {/* Drawer Overlay Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            onClick={() => setIsOpen(false)} 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Sheet Body */}
          <div className="relative w-full max-h-[85vh] bg-slate-900 border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col z-10 transition-transform duration-300 translate-y-0">
            {/* Grab Handle */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0">
              <h2 className="text-xl font-extrabold text-white">{t.title}</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Accordion List */}
            <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-4">
              
              {/* Prices Section */}
              {hasPrices && (
                <div className="border border-white/10 bg-slate-800/40 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => toggleSection('prices')}
                    className="flex items-center justify-between w-full p-4 font-bold text-left hover:bg-white/5 transition-colors text-amber-400 text-base"
                  >
                    <span className="flex items-center gap-2">💰 {getArticleLabel(locale, 'prices')}</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" 
                      className={`w-4 h-4 transition-transform duration-200 ${activeTab === 'prices' ? 'rotate-180' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {activeTab === 'prices' && (
                    <div className="p-4 border-t border-white/5 bg-slate-900/40 overflow-x-auto">
                      <PricesSection locale={locale} pricesInfo={pricesInfo} />
                    </div>
                  )}
                </div>
              )}

              {/* Practical Info Section */}
              {hasPractical && (
                <div className="border border-white/10 bg-slate-800/40 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => toggleSection('practical')}
                    className="flex items-center justify-between w-full p-4 font-bold text-left hover:bg-white/5 transition-colors text-emerald-400 text-base"
                  >
                    <span className="flex items-center gap-2">📋 {getArticleLabel(locale, 'practicalInfo')}</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" 
                      className={`w-4 h-4 transition-transform duration-200 ${activeTab === 'practical' ? 'rotate-180' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {activeTab === 'practical' && (
                    <div className="p-4 border-t border-white/5 bg-slate-900/40">
                      <PracticalInfoGrid locale={locale} practicalInfo={practicalInfo} />
                    </div>
                  )}
                </div>
              )}

              {/* Access Section */}
              {hasAccess && (
                <div className="border border-white/10 bg-slate-800/40 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => toggleSection('access')}
                    className="flex items-center justify-between w-full p-4 font-bold text-left hover:bg-white/5 transition-colors text-rose-400 text-base"
                  >
                    <span className="flex items-center gap-2">🚗 {getArticleLabel(locale, 'access')}</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" 
                      className={`w-4 h-4 transition-transform duration-200 ${activeTab === 'access' ? 'rotate-180' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {activeTab === 'access' && (
                    <div className="p-4 border-t border-white/5 bg-slate-900/40">
                      <AccessSection locale={locale} accessInfo={accessInfo} />
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}
