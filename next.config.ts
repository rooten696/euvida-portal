import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['100.64.47.108', '38.19.198.49'],
  images: {
    deviceSizes: [384, 640, 828, 1280, 1920],
    imageSizes: [32, 64, 128, 256],
    qualities: [75],
    formats: ['image/webp'],
    minimumCacheTTL: 2678400,
    maximumRedirects: 0,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'fizkhbssvuluclgaqnkx.supabase.co',
        pathname: '/storage/v1/object/public/article-images/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'commons.wikimedia.org',
        pathname: '/wiki/Special:FilePath/**',
      },
      {
        protocol: 'https',
        hostname: 'openweathermap.org',
        pathname: '/img/wn/**',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    ] }];
  },
};

export default withNextIntl(nextConfig);
