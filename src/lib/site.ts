// The site's public address, for link previews, the sitemap and robots.txt. On Vercel without NEXT_PUBLIC_SITE_URL,
// the production domain Vercel provides (never "localhost", which would break every share preview).
// No "/" at the end (the setting on Vercel has one, which made addresses like "…app//sitemap.xml").
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
).replace(/\/+$/, '');

/** Who made Chunav (owner, Oct 2026: "add at the bottom that this is created by me": name and portfolio link). */
export const MAKER_URL = 'https://lokeshbhatia.com';
