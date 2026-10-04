import { SITE_URL } from '@/lib/site';
import type { MetadataRoute } from 'next';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { CATEGORIES } from '@/lib/categories';
import { INDEX_MIN_VOTES } from '@/lib/polls';

// Built on request (the polls live in the database). Only polls the owner has reviewed and enough people voted in are
// listed (the same rule as the poll page's own "index" setting), each dated by its last vote, with its Hindi and
// Hinglish addresses (hreflang).
export const dynamic = 'force-dynamic';

const langs = (url: string) => ({ languages: { en: url, hi: `${url}${url.includes('?') ? '&' : '?'}l=hi`, 'hi-Latn': `${url}${url.includes('?') ? '&' : '?'}l=hg` } });

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = SITE_URL;
  const db = await getDb();
  const { polls, votes } = schema;
  const rows = await db
    .select({ id: polls.id, created: polls.createdAt, last: sql<Date | string | null>`max(${votes.createdAt})`, n: sql<number>`count(${votes.id})::int` })
    .from(polls)
    .leftJoin(votes, eq(votes.pollId, polls.id))
    .where(and(eq(polls.reviewed, true), eq(polls.hidden, false), isNull(polls.groupSize)))
    .groupBy(polls.id)
    .having(sql`count(${votes.id}) >= ${INDEX_MIN_VOTES}`)
    .orderBy(desc(polls.createdAt))
    .limit(1000);
  const newest = rows.reduce((m, r) => Math.max(m, new Date(r.last ?? r.created).getTime()), 0);
  const fresh = newest ? new Date(newest) : undefined;
  return [
    { url: `${site}/`, lastModified: fresh, changeFrequency: 'daily', priority: 1, alternates: langs(`${site}/`) },
    { url: `${site}/polls`, lastModified: fresh, changeFrequency: 'daily', priority: 0.8, alternates: langs(`${site}/polls`) },
    ...CATEGORIES.map((c) => ({ url: `${site}/topic/${c}`, changeFrequency: 'weekly' as const, priority: 0.6, alternates: langs(`${site}/topic/${c}`) })),
    ...rows.map((p) => ({ url: `${site}/p/${p.id}`, lastModified: new Date(p.last ?? p.created), changeFrequency: 'weekly' as const, priority: 0.5, alternates: langs(`${site}/p/${p.id}`) })),
  ];
}
