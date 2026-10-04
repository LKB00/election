import { SITE_URL } from '@/lib/site';
import type { MetadataRoute } from 'next';
import { getDb } from '@/db';
import { CATEGORIES } from '@/lib/categories';
import { getFeaturedId, listPolls } from '@/lib/polls';

// Built on request (the duels live in the database). Only duels the owner has reviewed are listed.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = SITE_URL;
  const db = await getDb();
  const [featured, polls] = await Promise.all([getFeaturedId(db), listPolls(db, 1000, { reviewedOnly: true })]);
  const now = new Date();
  return [
    { url: `${site}/`, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${site}/duels`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    ...CATEGORIES.map((c) => ({ url: `${site}/topic/${c}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.6 })),
    ...(featured ? [{ url: `${site}/p/${featured}`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.9 }] : []),
    ...polls.map((p) => ({ url: `${site}/p/${p.id}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.5 })),
  ];
}
