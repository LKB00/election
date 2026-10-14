import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { schema, type Db } from '@/db';
import { MAX_TITLE } from './limits';
import { createPoll, getPoll } from './polls';
import { createPollSchema } from './validation';

// Knockout battles (docs/DESIGN.md, "Knockout battles"): "Best biryani city", 8 → 4 → 2 → 1. Each match is an ordinary
// 2-choice poll (secret vote, results after you vote, reports, lists), tied to its battle. When every match of a round
// has ended, the winners meet in the next round; the last winner is the champion. A tie goes to the higher seed (the
// choice listed first), so a round never waits.
const { battles, polls, votes, options } = schema;
const battleId = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 8);

export type Entrant = { label: string; emoji: string };
export type Match = { pollId: string; round: number; slot: number; a: Entrant; b: Entrant; winner: 'a' | 'b' | null; open: boolean; myVote: boolean };
export type BattleView = { id: string; title: string; ownerId: string | null; showMaker: boolean; roundHours: number; size: number; entrants: Entrant[]; rounds: Match[][]; champion: string | null; endsAt: string | null };

/** A match's question: "Best biryani city: Hyderabad or Lucknow?" (just "Hyderabad or Lucknow?" if that is too long). */
const matchTitle = (title: string, a: string, b: string) => {
  const full = `${title}: ${a} or ${b}?`;
  return full.length <= MAX_TITLE ? full : `${a} or ${b}?`.slice(0, MAX_TITLE);
};

async function makeMatch(db: Db, b: { id: string; title: string; ownerId: string | null; showMaker: boolean; category: string; roundHours: number }, round: number, slot: number, x: Entrant, y: Entrant, now: number) {
  const input = createPollSchema.parse({
    title: matchTitle(b.title, x.label, y.label),
    options: [x.label, y.label],
    emojis: [x.emoji, y.emoji],
    category: b.category,
    showMaker: b.showMaker,
    endsAt: new Date(now + b.roundHours * 3600_000).toISOString(),
  });
  const id = await createPoll(db, input, undefined, undefined, b.ownerId ?? undefined);
  await db.update(polls).set({ battleId: b.id, battleRound: round, battleSlot: slot }).where(eq(polls.id, id));
  return id;
}

/** Makes the battle and its first round (entrants paired in order: 1 v 2, 3 v 4, …). */
export async function createBattle(db: Db, p: { title: string; entrants: Entrant[]; roundHours: number; showMaker: boolean; category: string }, ownerId: string, now = Date.now()) {
  const id = battleId();
  await db.insert(battles).values({ id, title: p.title, ownerId, showMaker: p.showMaker, category: p.category, entrants: JSON.stringify(p.entrants), roundHours: p.roundHours });
  const b = { id, title: p.title, ownerId, showMaker: p.showMaker, category: p.category, roundHours: p.roundHours };
  for (let k = 0; k < p.entrants.length / 2; k++) await makeMatch(db, b, 1, k, p.entrants[2 * k], p.entrants[2 * k + 1], now);
  return id;
}

/** Who won a finished match: more votes; a tie goes to the first choice (the higher seed). */
async function winnerOf(db: Db, pollId: string): Promise<'a' | 'b'> {
  const opts = await db.select({ id: options.id }).from(options).where(eq(options.pollId, pollId)).orderBy(asc(options.position));
  const counts = await db.select({ optionId: votes.optionId, n: sql<number>`count(*)::int` }).from(votes).where(eq(votes.pollId, pollId)).groupBy(votes.optionId);
  const n = (id?: string) => counts.find((c) => c.optionId === id)?.n ?? 0;
  return n(opts[1]?.id) > n(opts[0]?.id) ? 'b' : 'a';
}

/** When every match of the latest round has ended: the next round (or the champion). Safe to call any time. */
export async function advanceBattle(db: Db, id: string, now = Date.now()): Promise<'next' | 'champion' | 'waiting' | 'done' | 'not_found'> {
  return db.transaction(async (tx) => {
    const [b] = await tx.select().from(battles).where(eq(battles.id, id)).for('update').limit(1);
    if (!b) return 'not_found';
    if (b.champion) return 'done';
    const matches = await tx
      .select({ id: polls.id, round: polls.battleRound, slot: polls.battleSlot, endsAt: polls.endsAt, hidden: polls.hidden })
      .from(polls)
      .where(eq(polls.battleId, id))
      .orderBy(asc(polls.battleRound), asc(polls.battleSlot));
    if (!matches.length) return 'not_found';
    const round = Math.max(...matches.map((m) => m.round ?? 1));
    const current = matches.filter((m) => m.round === round);
    if (current.some((m) => !m.endsAt || m.endsAt.getTime() > now)) return 'waiting';
    const winners: Entrant[] = [];
    for (const m of current) {
      const view = await getPoll(tx as unknown as Db, m.id, null, null, { includeHidden: true, noPrevious: true });
      if (!view) continue;
      const w = (await winnerOf(tx as unknown as Db, m.id)) === 'a' ? view.options[0] : view.options[1];
      winners.push({ label: w.label, emoji: w.emoji ?? '' });
    }
    if (winners.length === 1) {
      await tx.update(battles).set({ champion: winners[0].label }).where(eq(battles.id, id));
      return 'champion';
    }
    for (let k = 0; k < winners.length / 2; k++) await makeMatch(tx as unknown as Db, b, round + 1, k, winners[2 * k], winners[2 * k + 1], now);
    return 'next';
  });
}

/** Moves on every battle whose round has ended (run on Home and by the evening job, like weekly polls). */
export async function advanceDueBattles(db: Db, now = Date.now()): Promise<number> {
  const open = await db.select({ id: battles.id }).from(battles).where(isNull(battles.champion)).limit(50);
  let n = 0;
  for (const b of open) if ((await advanceBattle(db, b.id, now).catch(() => 'waiting')) !== 'waiting') n++;
  return n;
}

/** The bracket: every round's matches, who won the finished ones, which are open now, and the champion. */
export async function getBattle(db: Db, id: string, voterId: string | null): Promise<BattleView | null> {
  await advanceBattle(db, id).catch(() => null);
  const [b] = await db.select().from(battles).where(eq(battles.id, id)).limit(1);
  if (!b) return null;
  const entrants = JSON.parse(b.entrants) as Entrant[];
  const rows = await db
    .select({ id: polls.id, round: polls.battleRound, slot: polls.battleSlot })
    .from(polls)
    .where(and(eq(polls.battleId, id), isNotNull(polls.battleRound), eq(polls.hidden, false)))
    .orderBy(asc(polls.battleRound), asc(polls.battleSlot));
  const rounds: Match[][] = [];
  let endsAt: string | null = null;
  for (const r of rows) {
    const v = await getPoll(db, r.id, voterId, null, { noPrevious: true });
    if (!v) continue;
    const [oa, ob] = v.options;
    const winner = v.closed ? await winnerOf(db, r.id) : null;
    const m: Match = { pollId: r.id, round: r.round ?? 1, slot: r.slot ?? 0, a: { label: oa.label, emoji: oa.emoji ?? '' }, b: { label: ob.label, emoji: ob.emoji ?? '' }, winner, open: !v.closed, myVote: v.myVote !== null };
    (rounds[m.round - 1] ??= []).push(m);
    if (!v.closed) endsAt = v.endsAt;
  }
  return { id: b.id, title: b.title, ownerId: b.ownerId, showMaker: b.showMaker, roundHours: b.roundHours, size: entrants.length, entrants, rounds, champion: b.champion, endsAt };
}

/** The battle a match belongs to (for the "Part of a knockout" link on its poll page). */
export async function battleOfPoll(db: Db, pollId: string): Promise<{ id: string; title: string } | null> {
  const [row] = await db.select({ id: battles.id, title: battles.title }).from(polls).innerJoin(battles, eq(battles.id, polls.battleId)).where(eq(polls.id, pollId)).limit(1);
  return row ?? null;
}
