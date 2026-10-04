import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { schema, type Db } from '@/db';
import { sameKey } from './validation';

// Poll maker tools (docs/DESIGN.md, "Poll maker tools"): only the profile that made a poll can use them. Everything the
// maker sees is counted for the whole poll (votes per hour, where votes came from), never per voter.
const { polls, options, votes, pollSources, suggestions } = schema;

export type MakerView = {
  id: string;
  title: string;
  description: string;
  kind: string;
  endsAt: string | null;
  closed: boolean;
  votes: number;
  /** Votes in each of the last 24 hours, oldest first (whole poll). */
  byHour: number[];
  /** Where votes came from: wa, ig, qr, link, other (whole poll). */
  sources: { src: string; n: number }[];
  /** Choices people suggested, waiting for the maker. */
  pending: { id: string; label: string; n: number }[];
  options: { id: string; label: string }[];
  /** Typos can be fixed until the first vote. */
  canEdit: boolean;
  suggestionsOn: boolean;
  /** The maker can share a results card: anyone may see the result (open results, or the poll has ended). */
  resultsPublic: boolean;
  groupSize: number | null;
};

/** The poll, if this profile made it. */
export async function ownPoll(db: Db, id: string, uid: string) {
  const [p] = await db.select().from(polls).where(and(eq(polls.id, id), eq(polls.ownerId, uid), eq(polls.hidden, false))).limit(1);
  return p ?? null;
}

export async function makerView(db: Db, id: string, uid: string): Promise<MakerView | null> {
  const p = await ownPoll(db, id, uid);
  if (!p) return null;
  const [opts, [{ n }], hours, srcs, pend] = await Promise.all([
    db.select({ id: options.id, label: options.label }).from(options).where(eq(options.pollId, id)).orderBy(asc(options.position)),
    db.select({ n: sql<number>`count(*)::int` }).from(votes).where(eq(votes.pollId, id)),
    db
      .select({ h: sql<number>`floor(extract(epoch from (now() - ${votes.createdAt})) / 3600)::int`, n: sql<number>`count(*)::int` })
      .from(votes)
      .where(and(eq(votes.pollId, id), sql`${votes.createdAt} > now() - interval '24 hours'`))
      .groupBy(sql`1`),
    db.select({ src: pollSources.src, n: pollSources.n }).from(pollSources).where(eq(pollSources.pollId, id)).orderBy(desc(pollSources.n)),
    db.select({ id: suggestions.id, label: suggestions.label, n: suggestions.n }).from(suggestions).where(eq(suggestions.pollId, id)).orderBy(desc(suggestions.n), asc(suggestions.createdAt)),
  ]);
  const byHour = Array.from({ length: 24 }, (_, k) => hours.find((x) => x.h === 23 - k)?.n ?? 0);
  const closed = !!p.endsAt && p.endsAt.getTime() <= Date.now();
  const groupDone = !p.groupSize || n >= p.groupSize;
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    kind: p.kind,
    endsAt: p.endsAt?.toISOString() ?? null,
    closed,
    votes: n,
    byHour,
    sources: srcs.filter((s) => s.n > 0),
    pending: pend,
    options: opts,
    canEdit: n === 0 && !closed,
    suggestionsOn: p.suggestionsOn,
    resultsPublic: n > 0 && p.category !== 'politics' && (closed || (!p.hideUntilVoted && groupDone)),
    groupSize: p.groupSize,
  };
}

/** "End now", or a new end time (a length button). Ending is final: an ended poll cannot be reopened. */
export async function setEnd(db: Db, id: string, uid: string, at: Date): Promise<'ok' | 'closed' | 'not_found'> {
  const p = await ownPoll(db, id, uid);
  if (!p) return 'not_found';
  if (p.endsAt && p.endsAt.getTime() <= Date.now()) return 'closed';
  await db.update(polls).set({ endsAt: at }).where(eq(polls.id, id));
  return 'ok';
}

/** Fix a typo: the question, details and choice words, only while nobody has voted (votes never change meaning). */
export async function editPoll(db: Db, id: string, uid: string, e: { title: string; description: string; options: { id: string; label: string }[] }): Promise<'ok' | 'voted' | 'not_found' | 'bad_option'> {
  const p = await ownPoll(db, id, uid);
  if (!p) return 'not_found';
  if (p.kind === 'rating') e = { ...e, options: [] };
  return db.transaction(async (tx) => {
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(votes).where(eq(votes.pollId, id));
    if (n > 0) return 'voted';
    const mine = await tx.select({ id: options.id }).from(options).where(eq(options.pollId, id));
    if (e.options.some((o) => !mine.some((m) => m.id === o.id))) return 'bad_option';
    await tx.update(polls).set({ title: e.title, description: e.description }).where(eq(polls.id, id));
    for (const o of e.options) await tx.update(options).set({ label: o.label }).where(and(eq(options.id, o.id), eq(options.pollId, id)));
    return 'ok';
  });
}

/** Where a vote came from (counted for the poll only; never kept with the vote). */
export async function countSource(db: Db, id: string, src: string) {
  await db
    .insert(pollSources)
    .values({ pollId: id, src, n: 1 })
    .onConflictDoUpdate({ target: [pollSources.pollId, pollSources.src], set: { n: sql`${pollSources.n} + 1` } });
}

/** A voter suggests a missing choice. Same words as an existing choice: nothing to add. Same as another suggestion: +1. */
export async function suggest(db: Db, id: string, label: string): Promise<'ok' | 'exists' | 'off' | 'full' | 'not_found'> {
  const [p] = await db.select().from(polls).where(and(eq(polls.id, id), eq(polls.hidden, false))).limit(1);
  if (!p) return 'not_found';
  if (!p.suggestionsOn || p.groupSize || (p.kind !== 'choice' && p.kind !== 'multi') || (p.endsAt && p.endsAt.getTime() <= Date.now())) return 'off';
  const opts = await db.select({ label: options.label }).from(options).where(eq(options.pollId, id));
  if (opts.some((o) => sameKey(o.label) === sameKey(label))) return 'exists';
  if (opts.length >= 10) return 'full';
  const [{ waiting }] = await db.select({ waiting: sql<number>`count(*)::int` }).from(suggestions).where(eq(suggestions.pollId, id));
  const same = (await db.select({ id: suggestions.id, label: suggestions.label }).from(suggestions).where(eq(suggestions.pollId, id))).find((s) => sameKey(s.label) === sameKey(label));
  if (same) {
    await db.update(suggestions).set({ n: sql`${suggestions.n} + 1` }).where(eq(suggestions.id, same.id));
    return 'ok';
  }
  if (waiting >= 30) return 'full';
  await db.insert(suggestions).values({ id: nanoid(10), pollId: id, label }).onConflictDoNothing();
  return 'ok';
}

/** The maker adds a suggestion as a real choice (at the end), or deletes it. */
export async function decideSuggestion(db: Db, id: string, uid: string, sid: string, add: boolean): Promise<'ok' | 'full' | 'not_found'> {
  const p = await ownPoll(db, id, uid);
  if (!p) return 'not_found';
  const [s] = await db.select().from(suggestions).where(and(eq(suggestions.id, sid), eq(suggestions.pollId, id))).limit(1);
  if (!s) return 'not_found';
  if (add) {
    const opts = await db.select({ label: options.label, position: options.position }).from(options).where(eq(options.pollId, id));
    if (opts.length >= 10) return 'full';
    if (!opts.some((o) => sameKey(o.label) === sameKey(s.label))) {
      await db.insert(options).values({ id: nanoid(10), pollId: id, label: s.label, position: Math.max(-1, ...opts.map((o) => o.position)) + 1, emoji: s.emoji });
    }
  }
  await db.delete(suggestions).where(eq(suggestions.id, sid));
  return 'ok';
}
