import createMiddleware from 'next-intl/middleware';

// Vytvoříme proxy místo middleware
const proxy = createMiddleware({
  locales: ['cs', 'en'],
  defaultLocale: 'cs'
});

export default proxy;

export const config = {
  // Tento radar chytne úplně všechny cesty na webu (kromě systémových souborů)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};