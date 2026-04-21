import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
 
// TADY JE TA OPRAVA: Ukázali jsme mu přesnou cestu k našemu souboru
const withNextIntl = createNextIntlPlugin('./i18n.ts');
 
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};
 
export default withNextIntl(nextConfig);