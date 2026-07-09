import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://euvida.eu';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/*/admin',
        '/*/login',
        '/*/oblibene',
        '/*/profile',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
