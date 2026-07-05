import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import '../globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CookieBanner from '../components/CookieBanner'; // 🍪 Přidán import banneru
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { GoogleAnalytics } from '@next/third-parties/google';

import { Analytics } from '@vercel/analytics/next';

import { SpeedInsights } from '@vercel/speed-insights/next';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
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

  // Tohle se nám vypíše dole v terminálu!
  console.log("➡️ LAYOUT VIDÍ JAZYK:", resolvedParams?.locale); 

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${outfit.variable} h-full scroll-smooth`} suppressHydrationWarning>
      <head>
        <script
          id="theme-switcher-inline"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme') === 'light') {
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.remove('light');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <div className="flex min-h-screen flex-col relative overflow-hidden">
            {/* Subtle Ambient Background Gradients */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[150px] pointer-events-none" />
            
            <Navbar /> 
            <div className="flex-grow flex flex-col z-10">
            {children}
          </div>
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
