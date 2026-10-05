import { and, eq, gte, inArray, ne, sql } from 'drizzle-orm';
import { schema, type Db } from '@/db';
import { indiaDay } from './polls';
import { INDIA_OFFSET } from './time';

// "Your month in opinions" (docs/DESIGN.md, "Month card"): a description of how this phone voted this month, made
// fresh each time from its own votes and never saved. It describes, never ranks: no score, no percentile, no
// comparison with other people. Politics polls are left out. Only polls whose results this voter may already see count.
const { votes, polls, options } = schema;

export type MonthType = 'crowd' | 'free' | 'mix';
export type MonthView = {
  /** First day of the month (India time), for its name. */
  monthStart: string;
  polls: number;
  /** Pick-one polls with a real crowd (3+ voters) and visible results: how often your pick was the top one. */
  withCrowd: number;
  judged: number;
  /** One square per judged poll, oldest first: 🟩 with the crowd, 🟪 against it. */
  grid: string;
  type: MonthType | null;
  rarest: { title: string; pick: string; pct: number } | null;
  topCategory: string | null;
};

/** This month's start in India time, as a Date. */
function monthStart(now = Date.now()) {
  const day = indiaDay(now).label; // "2026-10-04"
  return new Date(`${day.slice(0, 8)}01T00:00:00${INDIA_OFFSET}`);
}

export async function getMonth(db: Db, voterId: string | null, now = Date.now()): Promise<MonthView | null> {
  if (!voterId) return null;
  const start = monthStart(now);
  const mine = await db
    .select({
      pollId: votes.pollId,
      optionId: votes.optionId,
      prediction: votes.prediction,
      at: votes.createdAt,
      title: polls.title,
      kind: polls.kind,
      category: polls.category,
      hideUntilVoted: polls.hideUntilVoted,
      endsAt: polls.endsAt,
      calledIt: polls.calledIt,
      groupSize: polls.groupSize,
      pick: options.label,
    })
    .from(votes)
    .innerJoin(polls, eq(polls.id, votes.pollId))
    .innerJoin(options, eq(options.id, votes.optionId))
    .where(and(eq(votes.voterKey, voterId), gte(votes.createdAt, start), eq(polls.hidden, false), ne(polls.category, 'politics')))
    .orderBy(votes.createdAt);
  if (!mine.length) return null;
  const counts = await db
    .select({ pollId: votes.pollId, optionId: votes.optionId, n: sql<number>`count(*)::int` })
    .from(votes)
    .where(inArray(votes.pollId, mine.map((m) => m.pollId)))
    .groupBy(votes.pollId, votes.optionId);

  let withCrowd = 0;
  let judged = 0;
  let grid = '';
  let rarest: MonthView['rarest'] = null;
  const cats = new Map<string, number>();
  for (const m of mine) {
    cats.set(m.category, (cats.get(m.category) ?? 0) + 1);
    if (m.kind !== 'choice') continue;
    const rows = counts.filter((c) => c.pollId === m.pollId);
    const total = rows.reduce((s, c) => s + c.n, 0);
    const closed = !!m.endsAt && m.endsAt.getTime() <= now;
    // The same rule as the poll screen: never use numbers this voter cannot see yet.
    const groupDone = !m.groupSize || total >= m.groupSize || closed;
    const visible = groupDone && (closed || !m.hideUntilVoted || m.prediction != null || m.calledIt || !!m.groupSize);
    if (!visible || total < 3) continue;
    const my = rows.find((c) => c.optionId === m.optionId)?.n ?? 0;
    const top = Math.max(...rows.map((c) => c.n));
    const pct = Math.round((my / total) * 100);
    judged++;
    if (my === top) {
      withCrowd++;
      grid += '🟩';
    } else grid += '🟪';
    if (total >= 5 && (!rarest || pct < rarest.pct) && my !== top) rarest = { title: m.title, pick: m.pick, pct };
  }
  const named = [...cats.entries()].filter(([c]) => c !== 'general').sort((a, b) => b[1] - a[1]);
  const share = judged ? withCrowd / judged : 0;
  return {
    monthStart: start.toISOString(),
    polls: mine.length,
    withCrowd,
    judged,
    grid: grid.slice(-15),
    type: judged >= 3 ? (share >= 0.7 ? 'crowd' : share <= 0.4 ? 'free' : 'mix') : null,
    rarest,
    topCategory: named[0] && named[0][1] >= 2 ? named[0][0] : null,
  };
}
