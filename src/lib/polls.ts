import { and, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { nanoid, customAlphabet } from 'nanoid';
import { schema, type Db } from '@/db';
import type { CreatePollInput } from './validation';
import { namesPolitics } from './moderation';
import { sealedUntil } from './silence';

const { polls, options, votes, reactions, reports } = schema;

export const REACTIONS = ['🔥', '😂', '😮', '👏', '🤔'] as const;
const pollId = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 8);
const shareCodeId = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 10);

export type PollOption = {
  id: string;
  label: string;
  imageUrl: string | null;
  subtitle: string | null;
  imageCredit: string | null;
  /** The creator's emoji for this choice, if any. */
  emoji: string | null;
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
  /** Checked by the owner (only reviewed duels are offered to search engines). */
  reviewed: boolean;
  /** Election silence window: results of this politics duel stay sealed for everyone until this time. */
  sealedUntil: string | null;
  /** Choices for the one-tap "why?" question. Empty means the poll does not ask. */
  reasons: string[];
  myReason: string | null;
  /** Real activity, safe to show before voting. */
  pulse: { lastHour: number; lastVoteAt: string | null };
  /** "You're voter #15". Null until this person votes. */
  myVoterNumber: number | null;
  /** First option's share over time (0-100), only when results are visible and there are two options. */
  trend: { t: string; a: number }[];
  /** Counting day: running totals per option after each of 3 counting rounds (votes in the order they were cast). Only when results are visible. */
  rounds: Record<string, number>[];
  /** Swing: how the current leader's share moved in the last 24 hours (percentage points). Null when there is too little history. */
  swing: { optionId: string; points: number } | null;
  reactions: { emoji: string; n: number }[];
  myReactions: string[];
  /** You voted, but have not answered "who's winning right now?" yet. Results stay hidden until you do. */
  needsGuess: boolean;
  /** Your guess and whether it was right (null = skipped or not asked). */
  myGuess: { optionId: string; correct: boolean } | null;
  /** Code for your share link, and how the friends who used it voted. */
  myShareCode: string | null;
  friends: { agree: number; disagree: number };
  /** Opened from a friend's link: whether that friend exists, and their pick once you can see results. */
  friend: { known: boolean; optionId: string | null };
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
    // A duel that names a politician or party is politics, whatever was picked: silence windows and the review hold apply.
    category: namesPolitics(input.title, input.description, ...input.options) ? 'politics' : input.category,
    hideUntilVoted: input.hideUntilVoted,
    allowChange: input.allowChange,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  });
  await db.insert(options).values(input.options.map((label, position) => ({ id: nanoid(10), pollId: id, label, position, emoji: input.emojis[position] || null })));
  return id;
}

export async function getPoll(
  db: Db,
  id: string,
  voterId: string | null,
  via?: string | null,
  flags: { includeHidden?: boolean } = {},
): Promise<PollView | null> {
  const [poll] = await db.select().from(polls).where(eq(polls.id, id)).limit(1);
  if (!poll || (poll.hidden && !flags.includeHidden)) return null;

  const [opts, counts, mine, reasonRows, pulseRows, reactionRows, myReactionRows] = await Promise.all([
    db.select().from(options).where(eq(options.pollId, id)).orderBy(options.position),
    db
      .select({ optionId: votes.optionId, n: sql<number>`count(*)::int` })
      .from(votes)
      .where(eq(votes.pollId, id))
      .groupBy(votes.optionId),
    voterId
      ? db
          .select({
            optionId: votes.optionId,
            reason: votes.reason,
            createdAt: votes.createdAt,
            prediction: votes.prediction,
            predictionCorrect: votes.predictionCorrect,
            shareCode: votes.shareCode,
          })
          .from(votes)
          .where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId)))
          .limit(1)
      : Promise.resolve(
          [] as { optionId: string; reason: string | null; createdAt: Date; prediction: string | null; predictionCorrect: boolean | null; shareCode: string | null }[],
        ),
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
  // Guess first, then see: on hidden-results duels you answer "who's winning?" before the numbers show.
  // During an election silence window, politics duels show no numbers and ask no exit poll, to anyone.
  const sealed = sealedUntil(poll.category);
  const needsGuess = !sealed && poll.hideUntilVoted && !closed && myVote !== null && mine[0]?.prediction == null && opts.length >= 2;
  const resultsVisible = !sealed && (!poll.hideUntilVoted || closed || (myVote !== null && !needsGuess));

  // Your share code (made on first need, also for votes from before share codes existed).
  let myShareCode = mine[0]?.shareCode ?? null;
  if (mine[0] && !myShareCode && voterId) {
    myShareCode = shareCodeId();
    await db.update(votes).set({ shareCode: myShareCode }).where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId)));
  }
  const friendRows = myShareCode
    ? await db
        .select({ agree: sql<number>`count(*) filter (where ${votes.optionId} = ${myVote})::int`, all: sql<number>`count(*)::int` })
        .from(votes)
        .where(and(eq(votes.pollId, id), eq(votes.via, myShareCode)))
    : [];
  const friendVote = via
    ? (await db.select({ optionId: votes.optionId, voterKey: votes.voterKey }).from(votes).where(and(eq(votes.pollId, id), eq(votes.shareCode, via))).limit(1))[0]
    : undefined;
  const friendKnown = !!friendVote && friendVote.voterKey !== voterId;

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
  const [rounds, swing] = resultsVisible && total > 0 ? await Promise.all([countingRounds(db, id), swingSince(db, id, byOption, total)]) : [[], null];
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
    reviewed: poll.reviewed,
    sealedUntil: sealed,
    reasons: parseReasons(poll.reasons),
    myReason: mine[0]?.reason ?? null,
    pulse: { lastHour: pulseRows[0]?.lastHour ?? 0, lastVoteAt: lastVote ? new Date(lastVote).toISOString() : null },
    myVoterNumber,
    trend,
    rounds,
    swing,
    reactions: REACTIONS.map((e) => ({ emoji: e, n: reactionRows.find((r) => r.emoji === e)?.n ?? 0 })),
    myReactions: myReactionRows.map((r) => r.emoji),
    needsGuess,
    myGuess:
      // Sealed: "your exit poll was right" would tell who leads.
      !sealed && mine[0]?.prediction && mine[0].prediction !== 'skip' ? { optionId: mine[0].prediction, correct: !!mine[0].predictionCorrect } : null,
    myShareCode,
    friends: { agree: friendRows[0]?.agree ?? 0, disagree: (friendRows[0]?.all ?? 0) - (friendRows[0]?.agree ?? 0) },
    // The friend's pick stays a surprise until you have voted (and guessed).
    friend: { known: friendKnown, optionId: friendKnown && myVote !== null && resultsVisible ? friendVote!.optionId : null },
    options: opts.map((o) => {
      const n = resultsVisible ? (byOption.get(o.id) ?? 0) : 0;
      return {
        id: o.id,
        label: o.label,
        imageUrl: o.imageUrl,
        subtitle: o.subtitle,
        imageCredit: o.imageCredit,
        emoji: o.emoji,
        votes: n,
        percent: resultsVisible && total ? (n / total) * 100 : 0,
        reasons: resultsVisible
          ? reasonRows.filter((r) => r.optionId === o.id && r.reason).map((r) => ({ reason: r.reason as string, n: r.n })).sort((a, b) => b.n - a.n)
          : [],
      };
    }),
  };
}

/** Counting day: split the votes into 3 rounds by the time they were cast, and give the running total per option after each round. Real data, so the lead can really swing. */
async function countingRounds(db: Db, id: string): Promise<Record<string, number>[]> {
  const sq = db
    .select({ optionId: votes.optionId, r: sql<number>`ntile(3) over (order by ${votes.createdAt}, ${votes.id})`.as('r') })
    .from(votes)
    .where(eq(votes.pollId, id))
    .as('sq');
  const rows = await db.select({ optionId: sq.optionId, r: sq.r, n: sql<number>`count(*)::int` }).from(sq).groupBy(sq.optionId, sq.r);
  const out: Record<string, number>[] = [];
  const running: Record<string, number> = {};
  for (const round of [1, 2, 3]) {
    for (const row of rows) if (Number(row.r) === round) running[row.optionId] = (running[row.optionId] ?? 0) + row.n;
    out.push({ ...running });
  }
  return out;
}

/** The leader's share now minus their share 24 hours ago. Needs at least 5 votes from before, and a change since. */
async function swingSince(db: Db, id: string, now: Map<string, number>, total: number) {
  const before = await db
    .select({ optionId: votes.optionId, n: sql<number>`count(*)::int` })
    .from(votes)
    .where(and(eq(votes.pollId, id), sql`${votes.createdAt} <= now() - interval '24 hours'`))
    .groupBy(votes.optionId);
  const beforeTotal = before.reduce((s, r) => s + r.n, 0);
  if (beforeTotal < 5 || beforeTotal === total) return null;
  const leader = [...now.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!leader) return null;
  const then = ((before.find((r) => r.optionId === leader)?.n ?? 0) / beforeTotal) * 100;
  const points = Math.round(((now.get(leader) ?? 0) / total) * 100 - then);
  return points === 0 ? null : { optionId: leader, points };
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

export async function castVote(db: Db, id: string, optionId: string, voterId: string, via?: string | null): Promise<VoteResult> {
  const [poll] = await db.select().from(polls).where(eq(polls.id, id)).limit(1);
  if (!poll || poll.hidden) return 'not_found';
  if (poll.endsAt && poll.endsAt.getTime() <= Date.now()) return 'closed';
  const [opt] = await db.select({ id: options.id }).from(options).where(and(eq(options.id, optionId), eq(options.pollId, id))).limit(1);
  if (!opt) return 'bad_option';

  // Only keep "via" when it is a real share code for this duel from someone else.
  let viaCode: string | null = null;
  if (via) {
    const [ref] = await db.select({ voterKey: votes.voterKey }).from(votes).where(and(eq(votes.pollId, id), eq(votes.shareCode, via))).limit(1);
    if (ref && ref.voterKey !== voterId) viaCode = via;
  }
  const newVote = { id: nanoid(12), pollId: id, optionId, voterKey: voterId, prediction: null, shareCode: shareCodeId(), via: viaCode };

  if (poll.allowChange) {
    // One atomic statement: first vote inserts, a later vote moves it.
    const [row] = await db
      .insert(votes)
      .values(newVote)
      .onConflictDoUpdate({ target: [votes.pollId, votes.voterKey], set: { optionId } })
      .returning({ created: sql<boolean>`(xmax = 0)` });
    return row?.created ? 'ok' : 'changed';
  }
  // Unique index decides, so two fast taps can never count twice.
  const inserted = await db
    .insert(votes)
    .values(newVote)
    .onConflictDoNothing()
    .returning({ id: votes.id });
  return inserted.length ? 'ok' : 'already_voted';
}

/** "Who's winning right now?": checked against the live count (your vote included) at the moment you answer. */
export async function guessLeader(db: Db, id: string, voterId: string, choice: string): Promise<'ok' | 'not_allowed' | 'bad_option'> {
  const [poll] = await db.select({ category: polls.category }).from(polls).where(eq(polls.id, id)).limit(1);
  if (!poll || sealedUntil(poll.category)) return 'not_allowed';
  const [v] = await db
    .select({ prediction: votes.prediction })
    .from(votes)
    .where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId)))
    .limit(1);
  if (!v || v.prediction != null) return 'not_allowed';
  if (choice === 'skip') {
    await db.update(votes).set({ prediction: 'skip' }).where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId)));
    return 'ok';
  }
  const counts = await db
    .select({ optionId: options.id, n: sql<number>`count(${votes.id})::int` })
    .from(options)
    .leftJoin(votes, eq(votes.optionId, options.id))
    .where(eq(options.pollId, id))
    .groupBy(options.id);
  if (!counts.some((c) => c.optionId === choice)) return 'bad_option';
  const top = Math.max(...counts.map((c) => c.n));
  const correct = counts.some((c) => c.optionId === choice && c.n === top); // a tie: any leader counts
  await db
    .update(votes)
    .set({ prediction: choice, predictionCorrect: correct })
    .where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId), sql`${votes.prediction} is null`));
  return 'ok';
}

export type PollSummary = { id: string; title: string; category: string; totalVotes: number; lastHour: number; options: string[]; closed: boolean };

/** Public duels, newest first. Hidden duels never; unreviewed politics duels not until the owner checks them. */
export async function listPolls(db: Db, limit = 20, filter: { category?: string; reviewedOnly?: boolean } = {}): Promise<PollSummary[]> {
  const rows = await db
    .select({
      id: polls.id,
      title: polls.title,
      category: polls.category,
      endsAt: polls.endsAt,
      totalVotes: sql<number>`count(${votes.id})::int`,
      lastHour: sql<number>`count(${votes.id}) filter (where ${votes.createdAt} > now() - interval '1 hour')::int`,
    })
    .from(polls)
    .leftJoin(votes, eq(votes.pollId, polls.id))
    .where(
      and(
        eq(polls.featured, false),
        eq(polls.hidden, false),
        filter.reviewedOnly ? eq(polls.reviewed, true) : or(eq(polls.reviewed, true), ne(polls.category, 'politics')),
        filter.category ? eq(polls.category, filter.category) : undefined,
      ),
    )
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
    lastHour: r.lastHour,
    closed: !!r.endsAt && r.endsAt.getTime() <= Date.now(),
    options: opts.filter((o) => o.pollId === r.id).map((o) => o.label),
  }));
}

/** Id of the flagship poll, if there is one. */
export async function getFeaturedId(db: Db): Promise<string | null> {
  const [row] = await db.select({ id: polls.id }).from(polls).where(and(eq(polls.featured, true), eq(polls.hidden, false))).orderBy(desc(polls.createdAt)).limit(1);
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

export type VoterStats = { votes: number; today: number; guesses: number; correct: number; friends: number };

const EMPTY_STATS: VoterStats = { votes: 0, today: 0, guesses: 0, correct: 0, friends: 0 };

/** Your totals: votes, today's votes, "who's winning" guesses (and how many were right), friends who answered your dares. */
export async function getVoterStats(db: Db, voterId: string | null): Promise<VoterStats> {
  if (!voterId) return EMPTY_STATS;
  const [mineRow] = await db
    .select({
      votes: sql<number>`count(*)::int`,
      today: sql<number>`count(*) filter (where ${votes.createdAt} >= date_trunc('day', now()))::int`,
      guesses: sql<number>`count(*) filter (where ${votes.predictionCorrect} is not null)::int`,
      correct: sql<number>`count(*) filter (where ${votes.predictionCorrect})::int`,
    })
    .from(votes)
    .where(eq(votes.voterKey, voterId));
  const [friendRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(votes)
    .where(sql`${votes.via} in (select v2.share_code from votes v2 where v2.voter_key = ${voterId} and v2.share_code is not null)`);
  return { ...EMPTY_STATS, ...mineRow, friends: friendRow?.n ?? 0 };
}

/** The duels to play through: the featured one first, then the newest. */
export async function getDeck(db: Db, voterId: string | null, limit = 12): Promise<PollView[]> {
  const [featuredId, list] = await Promise.all([getFeaturedId(db), listPolls(db, limit)]);
  const ids = [...(featuredId ? [featuredId] : []), ...list.filter((p) => !p.closed).map((p) => p.id)].slice(0, limit);
  const views = await Promise.all(ids.map((id) => getPoll(db, id, voterId)));
  return views.filter((v): v is PollView => v !== null);
}

/** Where a duel you voted in stands now, as far as you are allowed to see (same rules as getPoll). */
export type Standing =
  | { kind: 'leading' | 'won'; name: string; percent: number }
  | { kind: 'tie' | 'tied' | 'guess' | 'sealed' | 'none' };
export type MyVote = { pollId: string; title: string; pick: string; at: string; standing: Standing };

/** The duels this voter took part in, newest first, with how each one stands now. */
export async function getMyVotes(db: Db, voterId: string | null, limit = 50): Promise<MyVote[]> {
  if (!voterId) return [];
  const rows = await db
    .select({
      pollId: votes.pollId,
      title: polls.title,
      pick: options.label,
      at: votes.createdAt,
      prediction: votes.prediction,
      category: polls.category,
      hideUntilVoted: polls.hideUntilVoted,
      endsAt: polls.endsAt,
    })
    .from(votes)
    .innerJoin(polls, eq(polls.id, votes.pollId))
    .innerJoin(options, eq(options.id, votes.optionId))
    .where(and(eq(votes.voterKey, voterId), eq(polls.hidden, false)))
    .orderBy(desc(votes.createdAt))
    .limit(limit);
  if (!rows.length) return [];
  const counts = await db
    .select({ pollId: options.pollId, label: options.label, n: sql<number>`count(${votes.id})::int` })
    .from(options)
    .leftJoin(votes, eq(votes.optionId, options.id))
    .where(inArray(options.pollId, rows.map((r) => r.pollId)))
    .groupBy(options.pollId, options.id, options.label);
  return rows.map((r) => {
    const closed = !!r.endsAt && r.endsAt.getTime() <= Date.now();
    const mine = counts.filter((c) => c.pollId === r.pollId).sort((a, b) => b.n - a.n);
    const total = mine.reduce((s, c) => s + c.n, 0);
    let standing: Standing;
    if (sealedUntil(r.category)) standing = { kind: 'sealed' };
    else if (r.hideUntilVoted && !closed && r.prediction == null && mine.length >= 2) standing = { kind: 'guess' };
    else if (!total) standing = { kind: 'none' };
    else if (mine.length > 1 && mine[0].n === mine[1].n) standing = { kind: closed ? 'tied' : 'tie' };
    else standing = { kind: closed ? 'won' : 'leading', name: mine[0].label, percent: Math.round((mine[0].n / total) * 100) };
    return { pollId: r.pollId, title: r.title, pick: r.pick, at: r.at.toISOString(), standing };
  });
}

/** How long after voting you can still take it back (an accidental tap). */
export const UNDO_SECONDS = 30;

/** Removes your vote (and its reactions) if you cast it in the last few seconds. */
export async function undoVote(db: Db, id: string, voterId: string): Promise<boolean> {
  const removed = await db
    .delete(votes)
    .where(
      and(
        eq(votes.pollId, id),
        eq(votes.voterKey, voterId),
        sql`${votes.createdAt} > now() - make_interval(secs => ${UNDO_SECONDS})`,
      ),
    )
    .returning({ id: votes.id });
  if (!removed.length) return false;
  await db.delete(reactions).where(and(eq(reactions.pollId, id), eq(reactions.voterKey, voterId)));
  return true;
}

// ---- Reports and the owner's review (docs/DESIGN.md, "Safety") ----

export const REPORT_REASONS = ['hate', 'false', 'private', 'spam', 'other'] as const;
/** Distinct reports that take an unreviewed duel down at once, until the owner looks (the law asks for removal within hours). */
export const AUTO_HIDE_REPORTS = 3;

/** One report per person per duel. An unreviewed duel with enough reports is hidden at once. */
export async function reportPoll(db: Db, id: string, voterId: string, reason: string): Promise<boolean> {
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) return false;
  const [poll] = await db.select({ id: polls.id, reviewed: polls.reviewed }).from(polls).where(and(eq(polls.id, id), eq(polls.hidden, false))).limit(1);
  if (!poll) return false;
  await db.insert(reports).values({ pollId: id, voterKey: voterId, reason }).onConflictDoNothing();
  if (!poll.reviewed) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(reports).where(eq(reports.pollId, id));
    if (n >= AUTO_HIDE_REPORTS) await db.update(polls).set({ hidden: true }).where(eq(polls.id, id));
  }
  return true;
}

export type ReviewItem = { id: string; title: string; options: string[]; category: string; hidden: boolean; reviewed: boolean; reports: number; reasons: string[]; createdAt: string };

/** What the owner should look at: reported duels first, then unreviewed ones, newest first. */
export async function getReviewQueue(db: Db, limit = 100): Promise<ReviewItem[]> {
  const rows = await db
    .select({
      id: polls.id,
      title: polls.title,
      category: polls.category,
      hidden: polls.hidden,
      reviewed: polls.reviewed,
      createdAt: polls.createdAt,
      reports: sql<number>`count(${reports.voterKey})::int`,
      reasons: sql<string | null>`string_agg(distinct ${reports.reason}, ',')`,
    })
    .from(polls)
    .leftJoin(reports, eq(reports.pollId, polls.id))
    .groupBy(polls.id)
    .having(sql`count(${reports.voterKey}) > 0 or not ${polls.reviewed} or ${polls.hidden}`)
    .orderBy(sql`count(${reports.voterKey}) desc`, desc(polls.createdAt))
    .limit(limit);
  const opts = rows.length
    ? await db.select({ pollId: options.pollId, label: options.label }).from(options).where(inArray(options.pollId, rows.map((r) => r.id))).orderBy(options.position)
    : [];
  return rows.map((r) => ({
    ...r,
    options: opts.filter((o) => o.pollId === r.id).map((o) => o.label),
    reasons: r.reasons ? r.reasons.split(',') : [],
    createdAt: r.createdAt.toISOString(),
  }));
}

/** The owner hides, shows or approves a duel. Approving also clears its reports. */
export async function setPollFlags(db: Db, id: string, flags: { hidden?: boolean; reviewed?: boolean }): Promise<boolean> {
  const updated = await db.update(polls).set(flags).where(eq(polls.id, id)).returning({ id: polls.id });
  if (updated.length && flags.reviewed) await db.delete(reports).where(eq(reports.pollId, id));
  return updated.length > 0;
}

/** "Delete my votes": everything stored for this voter (votes, reactions, reports). Friends' links to your share code stop counting. */
export async function deleteVoterData(db: Db, voterId: string): Promise<number> {
  await db.delete(reactions).where(eq(reactions.voterKey, voterId));
  await db.delete(reports).where(eq(reports.voterKey, voterId));
  const removed = await db.delete(votes).where(eq(votes.voterKey, voterId)).returning({ id: votes.id });
  return removed.length;
}
