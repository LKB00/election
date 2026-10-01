import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { nanoid, customAlphabet } from 'nanoid';
import { schema, type Db } from '@/db';
import type { CreatePollInput } from './validation';

const { polls, options, votes, reactions } = schema;

export const REACTIONS = ['🔥', '😂', '😮', '👏', '🤔'] as const;
const pollId = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 8);

export type PollOption = {
  id: string;
  label: string;
  imageUrl: string | null;
  subtitle: string | null;
  votes: number;
  percent: number;
  /** Why this option's voters picked it (only when results are visible). */
  reasons: { reason: string; n: number }[];
};
export type PollView = {
  id: string;
  title: string;
  description: string;
  category: string;
  hideUntilVoted: boolean;
  allowChange: boolean;
  endsAt: string | null;
  closed: boolean;
  totalVotes: number;
  /** How many people voted. Safe to show before voting: it does not reveal the split. */
  participants: number;
  /** The option this voter picked, if any. */
  myVote: string | null;
  /** False when the organiser hides numbers and this voter may not see them yet. */
  resultsVisible: boolean;
  featured: boolean;
  /** Choices for the one-tap "why?" question. Empty means the poll does not ask. */
  reasons: string[];
  myReason: string | null;
  /** Real activity, safe to show before voting. */
  pulse: { lastHour: number; lastVoteAt: string | null };
  /** "You're voter #15". Null until this person votes. */
  myVoterNumber: number | null;
  /** First option's share over time (0-100), only when results are visible and there are two options. */
  trend: { t: string; a: number }[];
  reactions: { emoji: string; n: number }[];
  myReactions: string[];
  options: PollOption[];
};

function parseReasons(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}

export async function createPoll(db: Db, input: CreatePollInput): Promise<string> {
  const id = pollId();
  await db.insert(polls).values({
    id,
    title: input.title,
    description: input.description,
    category: input.category,
    hideUntilVoted: input.hideUntilVoted,
    allowChange: input.allowChange,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  });
  await db.insert(options).values(input.options.map((label, position) => ({ id: nanoid(10), pollId: id, label, position })));
  return id;
}

export async function getPoll(db: Db, id: string, voterId: string | null): Promise<PollView | null> {
  const [poll] = await db.select().from(polls).where(eq(polls.id, id)).limit(1);
  if (!poll) return null;

  const [opts, counts, mine, reasonRows, pulseRows, reactionRows, myReactionRows] = await Promise.all([
    db.select().from(options).where(eq(options.pollId, id)).orderBy(options.position),
    db
      .select({ optionId: votes.optionId, n: sql<number>`count(*)::int` })
      .from(votes)
      .where(eq(votes.pollId, id))
      .groupBy(votes.optionId),
    voterId
      ? db
          .select({ optionId: votes.optionId, reason: votes.reason, createdAt: votes.createdAt })
          .from(votes)
          .where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId)))
          .limit(1)
      : Promise.resolve([] as { optionId: string; reason: string | null; createdAt: Date }[]),
    db
      .select({ optionId: votes.optionId, reason: votes.reason, n: sql<number>`count(*)::int` })
      .from(votes)
      .where(and(eq(votes.pollId, id), sql`${votes.reason} is not null`))
      .groupBy(votes.optionId, votes.reason),
    db
      .select({
        lastHour: sql<number>`count(*) filter (where ${votes.createdAt} > now() - interval '1 hour')::int`,
        lastVoteAt: sql<string | null>`max(${votes.createdAt})`,
      })
      .from(votes)
      .where(eq(votes.pollId, id)),
    db
      .select({ emoji: reactions.emoji, n: sql<number>`count(*)::int` })
      .from(reactions)
      .where(eq(reactions.pollId, id))
      .groupBy(reactions.emoji),
    voterId
      ? db.select({ emoji: reactions.emoji }).from(reactions).where(and(eq(reactions.pollId, id), eq(reactions.voterKey, voterId)))
      : Promise.resolve([] as { emoji: string }[]),
  ]);

  const byOption = new Map(counts.map((c) => [c.optionId, c.n]));
  const total = counts.reduce((s, c) => s + c.n, 0);
  const closed = !!poll.endsAt && poll.endsAt.getTime() <= Date.now();
  const myVote = mine[0]?.optionId ?? null;
  const resultsVisible = !poll.hideUntilVoted || closed || myVote !== null;

  const myVoterNumber = mine[0]
    ? (
        await db
          .select({ n: sql<number>`count(*)::int` })
          .from(votes)
          // Compared inside the database: JS dates lose Postgres's microseconds and would skip your own vote.
          .where(
            and(
              eq(votes.pollId, id),
              sql`${votes.createdAt} <= (select v2.created_at from votes v2 where v2.poll_id = ${id} and v2.voter_key = ${voterId})`,
            ),
          )
      )[0]?.n ?? null
    : null;
  const trend = resultsVisible && opts.length === 2 && total > 1 ? await shareOverTime(db, id, poll.createdAt, opts[0].id) : [];
  const lastVote = pulseRows[0]?.lastVoteAt;

  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    category: poll.category,
    hideUntilVoted: poll.hideUntilVoted,
    allowChange: poll.allowChange,
    endsAt: poll.endsAt?.toISOString() ?? null,
    closed,
    totalVotes: resultsVisible ? total : 0,
    participants: total,
    myVote,
    resultsVisible,
    featured: poll.featured,
    reasons: parseReasons(poll.reasons),
    myReason: mine[0]?.reason ?? null,
    pulse: { lastHour: pulseRows[0]?.lastHour ?? 0, lastVoteAt: lastVote ? new Date(lastVote).toISOString() : null },
    myVoterNumber,
    trend,
    reactions: REACTIONS.map((e) => ({ emoji: e, n: reactionRows.find((r) => r.emoji === e)?.n ?? 0 })),
    myReactions: myReactionRows.map((r) => r.emoji),
    options: opts.map((o) => {
      const n = resultsVisible ? (byOption.get(o.id) ?? 0) : 0;
      return {
        id: o.id,
        label: o.label,
        imageUrl: o.imageUrl,
        subtitle: o.subtitle,
        votes: n,
        percent: resultsVisible && total ? (n / total) * 100 : 0,
        reasons: resultsVisible
          ? reasonRows.filter((r) => r.optionId === o.id && r.reason).map((r) => ({ reason: r.reason as string, n: r.n })).sort((a, b) => b.n - a.n)
          : [],
      };
    }),
  };
}

/** The first option's running share, bucketed by hour (or by day for older polls). At most 48 points. */
async function shareOverTime(db: Db, id: string, createdAt: Date, firstOptionId: string) {
  const unit = Date.now() - createdAt.getTime() > 3 * 24 * 3600_000 ? 'day' : 'hour';
  const rows = await db
    .select({
      bucket: sql<string>`date_trunc(${unit}, ${votes.createdAt})`,
      a: sql<number>`count(*) filter (where ${votes.optionId} = ${firstOptionId})::int`,
      n: sql<number>`count(*)::int`,
    })
    .from(votes)
    .where(eq(votes.pollId, id))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  let a = 0;
  let n = 0;
  const total = rows.reduce((sum, r) => sum + r.n, 0);
  // Skip the first few votes: with 1-2 votes the share is always 0% or 100%, which tells nothing.
  const warmUp = Math.min(10, Math.ceil(total * 0.15));
  const points: { t: string; a: number }[] = [];
  for (const r of rows) {
    a += r.a;
    n += r.n;
    if (n >= warmUp) points.push({ t: new Date(r.bucket).toISOString(), a: (a / n) * 100 });
  }
  return points.slice(-48);
}

export type VoteResult = 'ok' | 'changed' | 'already_voted' | 'closed' | 'not_found' | 'bad_option';

export async function castVote(db: Db, id: string, optionId: string, voterId: string): Promise<VoteResult> {
  const [poll] = await db.select().from(polls).where(eq(polls.id, id)).limit(1);
  if (!poll) return 'not_found';
  if (poll.endsAt && poll.endsAt.getTime() <= Date.now()) return 'closed';
  const [opt] = await db.select({ id: options.id }).from(options).where(and(eq(options.id, optionId), eq(options.pollId, id))).limit(1);
  if (!opt) return 'bad_option';

  if (poll.allowChange) {
    // One atomic statement: first vote inserts, a later vote moves it.
    const [row] = await db
      .insert(votes)
      .values({ id: nanoid(12), pollId: id, optionId, voterKey: voterId })
      .onConflictDoUpdate({ target: [votes.pollId, votes.voterKey], set: { optionId } })
      .returning({ created: sql<boolean>`(xmax = 0)` });
    return row?.created ? 'ok' : 'changed';
  }
  // Unique index decides, so two fast taps can never count twice.
  const inserted = await db
    .insert(votes)
    .values({ id: nanoid(12), pollId: id, optionId, voterKey: voterId })
    .onConflictDoNothing()
    .returning({ id: votes.id });
  return inserted.length ? 'ok' : 'already_voted';
}

export type PollSummary = { id: string; title: string; category: string; totalVotes: number; options: string[]; closed: boolean };

export async function listPolls(db: Db, limit = 20): Promise<PollSummary[]> {
  const rows = await db
    .select({
      id: polls.id,
      title: polls.title,
      category: polls.category,
      endsAt: polls.endsAt,
      totalVotes: sql<number>`count(${votes.id})::int`,
    })
    .from(polls)
    .leftJoin(votes, eq(votes.pollId, polls.id))
    .where(eq(polls.featured, false))
    .groupBy(polls.id)
    .orderBy(desc(polls.createdAt))
    .limit(limit);
  if (!rows.length) return [];
  const opts = await db
    .select({ pollId: options.pollId, label: options.label, position: options.position })
    .from(options)
    .where(inArray(options.pollId, rows.map((r) => r.id)))
    .orderBy(options.position);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    totalVotes: r.totalVotes,
    closed: !!r.endsAt && r.endsAt.getTime() <= Date.now(),
    options: opts.filter((o) => o.pollId === r.id).map((o) => o.label),
  }));
}

/** Id of the flagship poll, if there is one. */
export async function getFeaturedId(db: Db): Promise<string | null> {
  const [row] = await db.select({ id: polls.id }).from(polls).where(eq(polls.featured, true)).orderBy(desc(polls.createdAt)).limit(1);
  return row?.id ?? null;
}

/** Saves the voter's one-tap "why". Only allowed answers, only for a vote they already cast. */
export async function setReason(db: Db, id: string, voterId: string, reason: string): Promise<boolean> {
  const [poll] = await db.select({ reasons: polls.reasons }).from(polls).where(eq(polls.id, id)).limit(1);
  if (!poll || !parseReasons(poll.reasons).includes(reason)) return false;
  const updated = await db
    .update(votes)
    .set({ reason })
    .where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId)))
    .returning({ id: votes.id });
  return updated.length > 0;
}

/** Adds or removes one emoji reaction. Only people who voted can react. */
export async function toggleReaction(db: Db, id: string, voterId: string, emoji: string): Promise<boolean> {
  if (!(REACTIONS as readonly string[]).includes(emoji)) return false;
  const [v] = await db.select({ id: votes.id }).from(votes).where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId))).limit(1);
  if (!v) return false;
  const removed = await db
    .delete(reactions)
    .where(and(eq(reactions.pollId, id), eq(reactions.voterKey, voterId), eq(reactions.emoji, emoji)))
    .returning({ e: reactions.emoji });
  if (!removed.length) await db.insert(reactions).values({ pollId: id, voterKey: voterId, emoji }).onConflictDoNothing();
  return true;
}

export type VoterStats = { votes: number; today: number; streak: number; best: number; days: string[] };

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Votes, today's count and the day streak for one voter. Days are UTC. */
export async function getVoterStats(db: Db, voterId: string | null): Promise<VoterStats> {
  if (!voterId) return { votes: 0, today: 0, streak: 0, best: 0, days: [] };
  const rows = await db
    .select({ day: sql<string>`to_char(${votes.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
    .from(votes)
    .where(eq(votes.voterKey, voterId))
    .groupBy(sql`1`)
    .orderBy(sql`1 desc`)
    .limit(400);
  const have = new Set(rows.map((r) => r.day));
  const today = dayKey(new Date());
  const step = (k: string) => dayKey(new Date(new Date(k + 'T00:00:00Z').getTime() - 86400_000));
  // Streak counts back from today, or from yesterday if you have not voted yet today.
  let cursor = have.has(today) ? today : step(today);
  let streak = 0;
  while (have.has(cursor)) {
    streak++;
    cursor = step(cursor);
  }
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...have].sort()) {
    run = prev && step(d) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return {
    votes: rows.reduce((s, r) => s + r.n, 0),
    today: rows.find((r) => r.day === today)?.n ?? 0,
    streak,
    best,
    days: rows.map((r) => r.day).slice(0, 14),
  };
}

/** The duels to play through: the featured one first, then the newest. */
export async function getDeck(db: Db, voterId: string | null, limit = 12): Promise<PollView[]> {
  const [featuredId, list] = await Promise.all([getFeaturedId(db), listPolls(db, limit)]);
  const ids = [...(featuredId ? [featuredId] : []), ...list.filter((p) => !p.closed).map((p) => p.id)].slice(0, limit);
  const views = await Promise.all(ids.map((id) => getPoll(db, id, voterId)));
  return views.filter((v): v is PollView => v !== null);
}

export type MyVote = { pollId: string; title: string; pick: string; at: string };

/** The duels this voter took part in, newest first. */
export async function getMyVotes(db: Db, voterId: string | null, limit = 50): Promise<MyVote[]> {
  if (!voterId) return [];
  const rows = await db
    .select({ pollId: votes.pollId, title: polls.title, pick: options.label, at: votes.createdAt })
    .from(votes)
    .innerJoin(polls, eq(polls.id, votes.pollId))
    .innerJoin(options, eq(options.id, votes.optionId))
    .where(eq(votes.voterKey, voterId))
    .orderBy(desc(votes.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, at: r.at.toISOString() }));
}
