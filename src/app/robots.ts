import type { MetadataRoute } from 'next';

// Search engines: the duels and topic pages yes; personal pages and the API no.
export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/me', '/admin'] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
