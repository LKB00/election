import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { nanoid, customAlphabet } from 'nanoid';
import { schema, type Db } from '@/db';
import type { CreatePollInput } from './validation';

const { polls, options, votes } = schema;
const pollId = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 8);

export type PollOption = { id: string; label: string; imageUrl: string | null; votes: number; percent: number };
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
  /** The option this voter picked, if any. */
  myVote: string | null;
  /** False when the organiser hides numbers and this voter may not see them yet. */
  resultsVisible: boolean;
  options: PollOption[];
};

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

  const [opts, counts, mine] = await Promise.all([
    db.select().from(options).where(eq(options.pollId, id)).orderBy(options.position),
    db
      .select({ optionId: votes.optionId, n: sql<number>`count(*)::int` })
      .from(votes)
      .where(eq(votes.pollId, id))
      .groupBy(votes.optionId),
    voterId
      ? db.select({ optionId: votes.optionId }).from(votes).where(and(eq(votes.pollId, id), eq(votes.voterKey, voterId))).limit(1)
      : Promise.resolve([] as { optionId: string }[]),
  ]);

  const byOption = new Map(counts.map((c) => [c.optionId, c.n]));
  const total = counts.reduce((s, c) => s + c.n, 0);
  const closed = !!poll.endsAt && poll.endsAt.getTime() <= Date.now();
  const myVote = mine[0]?.optionId ?? null;
  const resultsVisible = !poll.hideUntilVoted || closed || myVote !== null;

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
    myVote,
    resultsVisible,
    options: opts.map((o) => {
      const n = resultsVisible ? (byOption.get(o.id) ?? 0) : 0;
      return { id: o.id, label: o.label, imageUrl: o.imageUrl, votes: n, percent: resultsVisible && total ? (n / total) * 100 : 0 };
    }),
  };
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
