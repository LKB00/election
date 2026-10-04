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
