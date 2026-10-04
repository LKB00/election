import { SITE_URL } from '@/lib/site';
import type { MetadataRoute } from 'next';

// Search engines: the duels and topic pages yes; personal pages and the API no.
export default function robots(): MetadataRoute.Robots {
  const site = SITE_URL;
  return {
    // The share images stay open: X and LinkedIn obey robots.txt when they fetch a link preview.
    rules: [{ userAgent: '*', allow: ['/', '/api/og/', '/api/card/'], disallow: ['/api/', '/me', '/admin'] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
