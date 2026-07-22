import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://euvida.eu';
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
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
