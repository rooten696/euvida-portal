import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // Všech 5 jazyků, které podporujeme
  locales: ['cs', 'en', 'de', 'es', 'fr'],
  
  // Výchozí jazyk
  defaultLocale: 'cs',
  
  // Vždy zobrazovat kód jazyka v URL (např. /cs/...)
  localePrefix: 'always'
});

export const config = {
  // Tento matcher říká, které cesty má tento "překladač" hlídat
  matcher: [
    '/', 
    '/(cs|en|de|es|fr)/:path*',
    // Ignorujeme systémové věci a obrázky
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};