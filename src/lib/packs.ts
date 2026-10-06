import { and, asc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { schema, type Db } from '@/db';
import { createPoll, getPoll, type PollView } from './polls';
import type { CreatePollInput } from './validation';

// Match-day and show-night packs (docs/DESIGN.md, "Packs"): a few polls around one live moment, made in one go,
// whose predictions close when it starts. Each poll is an ordinary poll that points at its pack.
const { packs, polls, votes } = schema;
const packId = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 8);

export type PackKind = 'match' | 'show';
export type PackSummary = { id: string; kind: PackKind; title: string; startsAt: string; polls: number; votes: number };
export type PackView = PackSummary & { views: PollView[] };

/** Makes the pack and its polls (in order). The same private key marks every "Called it" result in it. */
export async function createPack(db: Db, p: { kind: PackKind; title: string; startsAt: string }, items: CreatePollInput[], manageKey: string, ownerId?: string) {
  const id = packId();
  await db.insert(packs).values({ id, kind: p.kind, title: p.title, startsAt: new Date(p.startsAt) });
  const pollIds: string[] = [];
  // One after another, so their order (by creation time) is the pack's order.
  // Predictions ("Called it") close at kick-off on the server too, whatever the request says.
  const start = new Date(p.startsAt).getTime();
  for (const item of items) {
    const capped = item.calledIt && (!item.endsAt || new Date(item.endsAt).getTime() > start) ? { ...item, endsAt: new Date(start).toISOString() } : item;
    pollIds.push(await createPoll(db, capped, manageKey, id, ownerId));
  }
  return { id, pollIds };
}

export async function getPack(db: Db, id: string, voterId: string | null): Promise<PackView | null> {
  const [pack] = await db.select().from(packs).where(eq(packs.id, id)).limit(1);
  if (!pack) return null;
  const rows = await db.select({ id: polls.id }).from(polls).where(and(eq(polls.packId, id), eq(polls.hidden, false))).orderBy(asc(polls.createdAt), asc(polls.id));
  const views = (await Promise.all(rows.map((r) => getPoll(db, r.id, voterId)))).filter((v): v is PollView => !!v);
  if (!views.length) return null;
  return {
    id: pack.id,
    kind: pack.kind === 'show' ? 'show' : 'match',
    title: pack.title,
    startsAt: pack.startsAt.toISOString(),
    polls: views.length,
    votes: views.reduce((n, v) => Math.max(n, v.participants), 0),
    views,
  };
}

/** "Tonight": packs starting in the next 36 hours, or started in the last 6 (results still coming in). */
export async function upcomingPacks(db: Db, limit = 4): Promise<PackSummary[]> {
  const now = Date.now();
  const rows = await db
    .select()
    .from(packs)
    .where(and(gt(packs.startsAt, new Date(now - 6 * 3_600_000)), lt(packs.startsAt, new Date(now + 36 * 3_600_000))))
    .orderBy(asc(packs.startsAt))
    .limit(limit);
  if (!rows.length) return [];
  const counts = await db
    .select({ packId: polls.packId, polls: sql<number>`count(distinct ${polls.id})::int`, votes: sql<number>`count(${votes.id})::int` })
    .from(polls)
    .leftJoin(votes, eq(votes.pollId, polls.id))
    .where(and(inArray(polls.packId, rows.map((r) => r.id)), eq(polls.hidden, false)))
    .groupBy(polls.packId);
  return rows
    .map((r) => {
      const c = counts.find((x) => x.packId === r.id);
      return { id: r.id, kind: (r.kind === 'show' ? 'show' : 'match') as PackKind, title: r.title, startsAt: r.startsAt.toISOString(), polls: c?.polls ?? 0, votes: c?.votes ?? 0 };
    })
    .filter((p) => p.polls > 0);
}
