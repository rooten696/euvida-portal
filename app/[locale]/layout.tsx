import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang={locale}>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Navbar /> 
          <div className="pt-16 flex-grow flex flex-col"> 
            {children}
          </div>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}