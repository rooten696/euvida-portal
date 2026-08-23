import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  // Všech 5 jazyků, které podporujeme
  locales: ['cs', 'en', 'de', 'es', 'fr'],
  
  // Výchozí jazyk
  defaultLocale: 'cs',
  
  // Vždy zobrazovat kód jazyka v URL (např. /cs/...)
  localePrefix: 'always'
});

const blockedCrawlerPatterns = [
  /AhrefsBot/i,
  /SemrushBot/i,
  /MJ12bot/i,
  /DotBot/i,
  /BLEXBot/i,
  /DataForSeoBot/i,
  /PetalBot/i,
  /Bytespider/i,
  /ClaudeBot/i,
  /GPTBot/i,
  /CCBot/i,
  /PerplexityBot/i,
  /Amazonbot/i,
];

export default function proxy(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') ?? '';
  const host = request.headers.get('host') ?? '';

  if (host.endsWith('.vercel.app')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  if (blockedCrawlerPatterns.some((pattern) => pattern.test(userAgent))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return intlMiddleware(request);
}

export const config = {
  // Tento matcher říká, které cesty má tento "překladač" hlídat - filtrovat pouze stránkové cesty
  matcher: [
    '/((?!api|_next|_vercel|flags|ads.txt|robots.txt|sitemap.xml|.*\\..*).*)'
  ]
};
