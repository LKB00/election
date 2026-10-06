import { sql } from 'drizzle-orm';
import type { Db } from '@/db';

// The owner's numbers on /admin. Totals only, never a list of people (privacy law: no profiles), from the vote rows the
// site already keeps. The main number is "weekly returning voters": people who voted on 2 or more different days in the
// last 7 (India time). See docs/ENGAGEMENT.md ("Count returning voters, not page views").
export type Stats = {
  weekVoters: number;
  weekReturning: number;
  todayVoters: number;
  todayVotes: number;
  weekViaFriends: number;
  weekVotes: number;
  newVoters: number;
  newCameBack: number;
  politicsVotes: number;
};

const istDay = (col: string) => sql.raw(`((${col} at time zone 'UTC') + interval '5 hours 30 minutes')::date`);

export async function getStats(db: Db): Promise<Stats> {
  const today = sql`((now() at time zone 'UTC') + interval '5 hours 30 minutes')::date`;
  const rows = await Promise.all([
    // Last 7 days: voters, returning voters (2+ different days), votes, votes from friends' links, politics votes.
    db
      .select({
        weekVoters: sql<number>`count(distinct v.voter_key)::int`,
        weekVotes: sql<number>`count(*)::int`,
        weekViaFriends: sql<number>`count(*) filter (where v.via is not null)::int`,
        politicsVotes: sql<number>`count(*) filter (where p.category = 'politics')::int`,
        todayVoters: sql<number>`count(distinct v.voter_key) filter (where ${istDay('v.created_at')} = ${today})::int`,
        todayVotes: sql<number>`count(*) filter (where ${istDay('v.created_at')} = ${today})::int`,
      })
      .from(sql`votes v join polls p on p.id = v.poll_id`)
      .where(sql`v.created_at > now() - interval '7 days'`),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(
        sql`(select v.voter_key from votes v where v.created_at > now() - interval '7 days' group by v.voter_key having count(distinct ${istDay('v.created_at')}) >= 2) r`,
      ),
    // New voters: first ever vote in the last 7 days; and how many of them voted again on another day.
    db
      .select({ all: sql<number>`count(*)::int`, back: sql<number>`count(*) filter (where days >= 2)::int` })
      .from(
        sql`(select v.voter_key, min(v.created_at) as first, count(distinct ${istDay('v.created_at')}) as days from votes v group by v.voter_key) n`,
      )
      .where(sql`n.first > now() - interval '7 days'`),
  ]);
  const [w] = rows[0];
  const [r] = rows[1];
  const [n] = rows[2];
  return {
    weekVoters: Number(w?.weekVoters ?? 0),
    weekVotes: Number(w?.weekVotes ?? 0),
    weekViaFriends: Number(w?.weekViaFriends ?? 0),
    politicsVotes: Number(w?.politicsVotes ?? 0),
    todayVoters: Number(w?.todayVoters ?? 0),
    todayVotes: Number(w?.todayVotes ?? 0),
    weekReturning: Number(r?.n ?? 0),
    newVoters: Number(n?.all ?? 0),
    newCameBack: Number(n?.back ?? 0),
  };
}

/** The engagement score's window and noise floor: polls made in the last ENGAGE_DAYS days with at least
 *  ENGAGE_MIN_VOTES votes (one vote and one reaction would score 100 and mean nothing). */
export const ENGAGE_DAYS = 30;
export const ENGAGE_MIN_VOTES = 3;

export type EngagedPoll = { id: string; title: string; category: string; votes: number; score: number };
export type Engagement = { polls: EngagedPoll[]; topics: { category: string; polls: number; score: number }[] };

/** How much a poll gets people doing more than voting, 0-100 (owner, Oct 2026: "an engagement score"). Half of it is
 *  how many of its votes came through friends' links (sharing that worked), a quarter reactions per vote, a quarter the
 *  share of voters who said why. From rows the site already keeps; counts only, never people. */
export const engagementScore = (votes: number, viaFriends: number, reactions: number, reasons: number) =>
  votes ? Math.round(100 * (0.5 * (viaFriends / votes) + 0.25 * Math.min(1, reactions / votes) + 0.25 * (reasons / votes))) : 0;

export async function getEngagement(db: Db, top = 5): Promise<Engagement> {
  const rows = (await db.execute(sql`
    select p.id, p.title, p.category,
      count(v.id)::int as votes,
      count(v.id) filter (where v.via is not null)::int as via,
      count(v.id) filter (where v.reason is not null)::int as reasons,
      (select count(*)::int from reactions r where r.poll_id = p.id) as reactions
    from polls p join votes v on v.poll_id = p.id
    where p.hidden = false and p.created_at > now() - make_interval(days => ${ENGAGE_DAYS})
    group by p.id
    having count(v.id) >= ${ENGAGE_MIN_VOTES}`)) as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[];
  const list = (Array.isArray(rows) ? rows : rows.rows ?? []).map((r) => {
    const votes = Number(r.votes);
    return { id: String(r.id), title: String(r.title), category: String(r.category), votes, score: engagementScore(votes, Number(r.via), Number(r.reactions), Number(r.reasons)) };
  });
  const byTopic = new Map<string, EngagedPoll[]>();
  for (const p of list) byTopic.set(p.category, [...(byTopic.get(p.category) ?? []), p]);
  return {
    polls: [...list].sort((a, b) => b.score - a.score || b.votes - a.votes).slice(0, top),
    topics: [...byTopic.entries()]
      .map(([category, ps]) => ({ category, polls: ps.length, score: Math.round(ps.reduce((s, p) => s + p.score, 0) / ps.length) }))
      .sort((a, b) => b.score - a.score),
  };
}
