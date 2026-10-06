import { and, asc, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { schema, type Db } from '@/db';
import { sameKey } from './validation';
import { namesPolitics } from './moderation';
import { DELETED_KEEP_DAYS, MAX_CHOICES, MAX_WAITING_SUGGESTIONS } from './limits';

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
  /** "Called it": the answer still to mark (null once marked, or for other polls). */
  calledOpen: boolean;
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
    // The "Other" choice is never edited (its words are the site's, in each voter's language).
    db.select({ id: options.id, label: options.label }).from(options).where(and(eq(options.pollId, id), eq(options.isOther, false))).orderBy(asc(options.position)),
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
    calledOpen: p.calledIt && !p.outcome,
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
/** A fix or an added choice that now names a politician or party makes the poll a politics poll, as making it would
 * have: the review hold, silence windows and Election mode then apply, and "Called it" is off (createPoll in polls.ts). */
function politicsNow(p: { category: string }, ...text: string[]) {
  return p.category !== 'politics' && namesPolitics(...text) ? { category: 'politics', reviewed: false, calledIt: false } : {};
}

export async function editPoll(db: Db, id: string, uid: string, e: { title: string; description: string; options: { id: string; label: string }[] }): Promise<'ok' | 'voted' | 'not_found' | 'bad_option' | 'same'> {
  const p = await ownPoll(db, id, uid);
  if (!p) return 'not_found';
  if (p.kind === 'rating') e = { ...e, options: [] };
  return db.transaction(async (tx) => {
    // Hold the poll row until the save, so no vote can land on a choice while its words change (castVote waits).
    await tx.select({ id: polls.id }).from(polls).where(eq(polls.id, id)).for('update');
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(votes).where(eq(votes.pollId, id));
    if (n > 0) return 'voted';
    const mine = await tx.select({ id: options.id, label: options.label }).from(options).where(eq(options.pollId, id));
    if (e.options.some((o) => !mine.some((m) => m.id === o.id))) return 'bad_option';
    // The choices after the fix (sent ones changed, the rest as they are) must still all differ.
    const after = mine.map((m) => e.options.find((o) => o.id === m.id)?.label ?? m.label);
    if (new Set(after.map(sameKey)).size !== after.length) return 'same';
    await tx.update(polls).set({ title: e.title, description: e.description, ...politicsNow(p, e.title, e.description, ...after) }).where(eq(polls.id, id));
    for (const o of e.options) await tx.update(options).set({ label: o.label }).where(and(eq(options.id, o.id), eq(options.pollId, id)));
    return 'ok';
  });
}

/** "Called it": the signed-in maker marks what happened (on any phone; the phone key is only for makers without a
 * profile). Closes the poll, like the phone-key path in polls.ts. */
export async function markOutcome(db: Db, id: string, uid: string, optionId: string): Promise<'ok' | 'done' | 'taken' | 'bad_option' | 'not_found'> {
  const p = await ownPoll(db, id, uid);
  if (!p || !p.calledIt) return 'not_found';
  if (p.outcome) return p.outcome === optionId ? 'done' : 'taken';
  const [opt] = await db.select({ id: options.id }).from(options).where(and(eq(options.id, optionId), eq(options.pollId, id))).limit(1);
  if (!opt) return 'bad_option';
  const now = new Date();
  // Only if still unmarked (two phones at once: the first answer stands).
  const set = await db
    .update(polls)
    .set({ outcome: optionId, outcomeAt: now, endsAt: p.endsAt && p.endsAt < now ? p.endsAt : now })
    .where(and(eq(polls.id, id), isNull(polls.outcome)))
    .returning({ id: polls.id });
  return set.length ? 'ok' : 'taken';
}

/** "Delete poll": the maker takes their poll down for everyone, at once and for good (no undo, and the owner's
 * "Show again" cannot bring it back). Its record stays hidden for DELETED_KEEP_DAYS, as the Rules promise, then
 * purgeDeleted erases it with its votes. Works on a poll the owner hid after reports too. */
export async function deletePoll(db: Db, id: string, uid: string): Promise<'ok' | 'not_found'> {
  const done = await db
    .update(polls)
    .set({ hidden: true, deletedAt: new Date(), featured: false, todayOn: null })
    .where(and(eq(polls.id, id), eq(polls.ownerId, uid), isNull(polls.deletedAt)))
    .returning({ id: polls.id });
  if (!done.length) return 'not_found';
  // Nobody is told "the result is in" for a poll that is gone.
  await db.delete(schema.pushWants).where(eq(schema.pushWants.pollId, id));
  await db.delete(schema.pushMilestones).where(eq(schema.pushMilestones.pollId, id));
  return 'ok';
}

/** Erases polls their makers deleted more than DELETED_KEEP_DAYS ago (votes, choices and the rest go with them). */
export async function purgeDeleted(db: Db, now = Date.now()): Promise<number> {
  const before = new Date(now - DELETED_KEEP_DAYS * 86_400_000);
  const gone = await db.delete(polls).where(lt(polls.deletedAt, before)).returning({ id: polls.id });
  return gone.length;
}

/** Where a vote came from (counted for the poll only; never kept with the vote). */
export async function countSource(db: Db, id: string, src: string) {
  await db
    .insert(pollSources)
    .values({ pollId: id, src, n: 1 })
    .onConflictDoUpdate({ target: [pollSources.pollId, pollSources.src], set: { n: sql`${pollSources.n} + 1` } });
}

/** A voter suggests a missing choice. Same words as an existing choice: nothing to add. Same as another suggestion: +1. */
export async function suggest(db: Db, id: string, label: string): Promise<'ok' | 'exists' | 'off' | 'closed' | 'full' | 'not_found'> {
  const [p] = await db.select().from(polls).where(and(eq(polls.id, id), eq(polls.hidden, false))).limit(1);
  if (!p) return 'not_found';
  if (p.endsAt && p.endsAt.getTime() <= Date.now()) return 'closed';
  if (!p.suggestionsOn || p.groupSize || (p.kind !== 'choice' && p.kind !== 'multi')) return 'off';
  const opts = await db.select({ label: options.label }).from(options).where(eq(options.pollId, id));
  if (opts.some((o) => sameKey(o.label) === sameKey(label))) return 'exists';
  if (opts.length >= MAX_CHOICES) return 'full';
  // Held per poll, so the same suggestion sent twice at once is counted twice (n = 2), not saved twice.
  return db.transaction(async (tx) => {
    await tx.select({ id: polls.id }).from(polls).where(eq(polls.id, id)).for('update');
    const waiting = await tx.select({ id: suggestions.id, label: suggestions.label }).from(suggestions).where(eq(suggestions.pollId, id));
    const same = waiting.find((s) => sameKey(s.label) === sameKey(label));
    if (same) {
      await tx.update(suggestions).set({ n: sql`${suggestions.n} + 1` }).where(eq(suggestions.id, same.id));
      return 'ok';
    }
    if (waiting.length >= MAX_WAITING_SUGGESTIONS) return 'full';
    await tx.insert(suggestions).values({ id: nanoid(10), pollId: id, label }).onConflictDoNothing();
    return 'ok';
  });
}

/** The maker adds a suggestion as a real choice (at the end), or deletes it. */
export async function decideSuggestion(db: Db, id: string, uid: string, sid: string, add: boolean): Promise<'ok' | 'full' | 'not_found'> {
  const p = await ownPoll(db, id, uid);
  if (!p) return 'not_found';
  // One at a time per poll (the row is held), so two quick "Add" taps cannot pass the choice limit or share a place.
  return db.transaction(async (tx) => {
    await tx.select({ id: polls.id }).from(polls).where(eq(polls.id, id)).for('update');
    const [s] = await tx.select().from(suggestions).where(and(eq(suggestions.id, sid), eq(suggestions.pollId, id))).limit(1);
    if (!s) return 'not_found';
    if (add) {
      const opts = await tx.select({ label: options.label, position: options.position }).from(options).where(eq(options.pollId, id));
      if (opts.length >= MAX_CHOICES) return 'full';
      if (!opts.some((o) => sameKey(o.label) === sameKey(s.label))) {
        await tx.insert(options).values({ id: nanoid(10), pollId: id, label: s.label, position: Math.max(-1, ...opts.map((o) => o.position)) + 1, emoji: s.emoji });
        const now = politicsNow(p, s.label);
        if ('category' in now) await tx.update(polls).set(now).where(eq(polls.id, id));
      }
    }
    await tx.delete(suggestions).where(eq(suggestions.id, sid));
    return 'ok';
  });
}
