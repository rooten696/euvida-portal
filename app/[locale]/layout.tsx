import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import '../globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CookieBanner from '../components/CookieBanner'; // 🍪 Přidán import banneru
import ThemeInitializer from '../components/ThemeInitializer';
import GlobalAdPlacement from '../components/ads/GlobalAdPlacement';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { GoogleAnalytics } from '@next/third-parties/google';
import { supportedLocales, type AdPlacement, type SupportedLocale } from '@/lib/articleTypes';
import Script from 'next/script';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

const getHeaderPlacement = cache(async () => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from('ad_placements')
      .select('*')
      .eq('slot', 'header')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();
    return (data as AdPlacement) || null;
  } catch {
    return null;
  }
});

const getFooterPlacement = cache(async () => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from('ad_placements')
      .select('*')
      .eq('slot', 'footer')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();
    return (data as AdPlacement) || null;
  } catch {
    return null;
  }
});

export async function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

import { Analytics } from '@vercel/analytics/next';

import { SpeedInsights } from '@vercel/speed-insights/next';

import { canonicalMetadataBase } from '@/lib/siteConfig';

const outfit = Outfit({
  subsets: ['latin'],

  variable: '--font-outfit',
});

export const metadata: Metadata = {
  metadataBase: canonicalMetadataBase,
  title: 'Euvida | Vše o životě a cestování v Evropě',
  description: 'Prozkoumejte nejlepší destinace pro život, práci a cestování.',
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>; // Přidán otazník (může chybět)
}) {
  const resolvedParams = await params;
  
  // Pokud se jazyk ztratí, vnutíme 'cs' ať web nepadá
  const locale = resolvedParams?.locale || 'cs'; 

  // Nastavíme locale pro static rendering na serveru
  setRequestLocale(locale);

  const [messages, headerPlacement, footerPlacement] = await Promise.all([
    getMessages({ locale }),
    getHeaderPlacement(),
    getFooterPlacement(),
  ]);


  return (
    <html lang={locale} className={`${outfit.variable} h-full scroll-smooth`} suppressHydrationWarning>
      <head>
        <script
          id="google-consent-default"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                ad_storage: 'denied',
                analytics_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                functionality_storage: 'granted',
                security_storage: 'granted'
              });
            `,
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
        <Script
          id="theme-time-default"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var savedTheme = localStorage.getItem('theme');
                var hour = new Date().getHours();
                var theme = savedTheme === 'dark' || savedTheme === 'light'
                  ? savedTheme
                  : (hour >= 7 && hour < 20 ? 'light' : 'dark');
                if (theme === 'light') {
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.remove('light');
                }
              } catch (_) {}
            `,
          }}
        />
        <ThemeInitializer />
        <NextIntlClientProvider messages={messages} locale={locale}>
          <div className="flex min-h-screen flex-col relative overflow-hidden">
            {/* Subtle Ambient Background Gradients */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[150px] pointer-events-none" />
            
            <Navbar /> 
            {headerPlacement && (
              <div className="mx-auto w-full max-w-[1360px] px-4 md:px-6 z-20">
                <GlobalAdPlacement slot="header" placement={headerPlacement} locale={locale as SupportedLocale} />
              </div>
            )}
            <div className="flex-grow flex flex-col z-10">
              {children}
            </div>
            {footerPlacement && (
              <div className="mx-auto w-full max-w-[1360px] px-4 md:px-6 z-20">
                <GlobalAdPlacement slot="footer" placement={footerPlacement} locale={locale as SupportedLocale} />
              </div>
            )}
            <Footer locale={locale} />

            {/* 🍪 COOKIE BANNER musí být uvnitř Provideru, aby měl přístup k překladům */}
            <CookieBanner />
          </div>
        </NextIntlClientProvider>

        {/* 🚀 GOOGLE ANALYTICS (přesunuto dovnitř body pro validní HTML) */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        

        {/* 📊 VERCEL WEB ANALYTICS */}
        <Analytics />

        {/* 📊 VERCEL SPEED INSIGHTS */}
        <SpeedInsights />

      </body>
    </html>
  );
}
