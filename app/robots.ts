import { MetadataRoute } from 'next';
import { getCanonicalUrl } from '@/lib/siteConfig';

export default function robots(): MetadataRoute.Robots {
  const blockedCrawlers = [
    'AhrefsBot',
    'SemrushBot',
    'MJ12bot',
    'DotBot',
    'BLEXBot',
    'DataForSeoBot',
    'PetalBot',
    'Bytespider',
    'ClaudeBot',
    'GPTBot',
    'CCBot',
    'PerplexityBot',
    'Amazonbot',
  ];

  return {
    rules: [
      {
        userAgent: ['OAI-SearchBot', 'ChatGPT-User'],
        allow: '/',
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/*/admin',
          '/*/login',
          '/*/oblibene',
          '/*/profile',
          '/*/articles?*',
        ],
      },
      ...blockedCrawlers.map((crawler) => ({
        userAgent: crawler,
        disallow: '/',
      })),
    ],
    sitemap: getCanonicalUrl('/sitemap.xml'),
  };
}
