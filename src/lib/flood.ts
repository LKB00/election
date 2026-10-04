import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { schema, type Db } from '@/db';

const { polls, voteFlow } = schema;

// Flood guard: no anonymous poll can promise one vote per person, but a flood from one place is easy to spot.
// Each vote leaves a row with a scrambled network code (the same salted hash the rate limits use; never the address and
// never linked to the voter). Rows go after an hour.
//
// 1. Soft limit per network: Indian mobile networks put many people behind one address, so it is generous.
// 2. Pause: when a poll's recent flood comes from only a few networks (many votes each; real sharing comes from many
//    different phones, 1–2 votes per network), or any big surge hits a politics poll, voting pauses for a while and the
//    owner's phone gets an alert. Results stay visible; the owner can resume it from /admin.
export const FLOW_WINDOW_MIN = 10;
export const NET_LIMIT = 60;
export const NET_LIMIT_POLITICS = 25;
export const SPIKE_MIN = 100;
export const SPIKE_PER_NET = 8;
export const POLITICS_SURGE = 300;
export const FREEZE_MIN = 30;

const windowStart = sql`now() - make_interval(mins => ${FLOW_WINDOW_MIN})`;

/** Before a vote: 'frozen' while the poll is paused, 'busy' when this network already voted a lot on it just now. */
export async function checkFlow(db: Db, pollId: string, net: string, category: string): Promise<'ok' | 'frozen' | 'busy'> {
  const [poll] = await db.select({ frozen: sql<boolean>`coalesce(${polls.frozenUntil} > now(), false)` }).from(polls).where(eq(polls.id, pollId)).limit(1);
  if (poll?.frozen) return 'frozen';
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(voteFlow)
    .where(and(eq(voteFlow.pollId, pollId), eq(voteFlow.net, net), gt(voteFlow.at, windowStart)));
  return n >= (category === 'politics' ? NET_LIMIT_POLITICS : NET_LIMIT) ? 'busy' : 'ok';
}

/** After a vote counted: note where it came from, and pause the poll if this is a flood. True = this vote paused it. */
export async function recordFlow(db: Db, pollId: string, net: string, category: string): Promise<boolean> {
  await db.insert(voteFlow).values({ pollId, net });
  // Old rows go now and then (cheap: indexed by time).
  if (Math.random() < 0.05) await db.delete(voteFlow).where(lt(voteFlow.at, sql`now() - interval '1 hour'`));
  const perNet = db
    .select({ c: sql<number>`count(*)`.as('c') })
    .from(voteFlow)
    .where(and(eq(voteFlow.pollId, pollId), gt(voteFlow.at, windowStart)))
    .groupBy(voteFlow.net)
    .as('per_net');
  const [row] = await db.select({ total: sql<number>`coalesce(sum(${perNet.c}), 0)::int`, nets: sql<number>`count(*)::int` }).from(perNet);
  const total = Number(row?.total ?? 0);
  const nets = Math.max(1, Number(row?.nets ?? 0));
  const flood = (total >= SPIKE_MIN && total / nets >= SPIKE_PER_NET) || (category === 'politics' && total >= POLITICS_SURGE);
  if (!flood) return false;
  // Only the vote that starts a pause reports it (one alert, not hundreds).
  const paused = await db
    .update(polls)
    .set({ frozenUntil: sql`now() + make_interval(mins => ${FREEZE_MIN})` })
    .where(and(eq(polls.id, pollId), sql`(${polls.frozenUntil} is null or ${polls.frozenUntil} <= now())`))
    .returning({ id: polls.id });
  return paused.length > 0;
}

/** The owner looked: voting opens again, and the recent flow is forgotten so it does not pause straight away again. */
export async function resumeVoting(db: Db, pollId: string): Promise<boolean> {
  const updated = await db.update(polls).set({ frozenUntil: null }).where(eq(polls.id, pollId)).returning({ id: polls.id });
  await db.delete(voteFlow).where(eq(voteFlow.pollId, pollId));
  return updated.length > 0;
}
