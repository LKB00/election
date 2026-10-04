// The site's public address, for link previews, the sitemap and robots.txt. On Vercel without NEXT_PUBLIC_SITE_URL,
// the production domain Vercel provides (never "localhost", which would break every share preview).
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
