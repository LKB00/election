import type { Metadata } from 'next';
import DuelTiles from '@/components/DuelTiles';
import TodayCard from '@/components/Today';
import { getDb } from '@/db';
import { getMyVotes, getVoterStats, listPolls } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Duels' };

export default async function Duels() {
  const db = await getDb();
  const voterId = await readVoterId();
  const [polls, stats, mine] = await Promise.all([listPolls(db, 60), getVoterStats(db, voterId), getMyVotes(db, voterId, 200)]);
  return (
    <div className="page page-wide">
      <header className="page-head">
        <h1 className="display">Duels</h1>
        <p className="lead">Pick a duel. Vote, see the split, dare your friends.</p>
      </header>
      <section className="block block-tight">
        <TodayCard initial={stats} />
      </section>
      <section className="block">
        <DuelTiles polls={polls} votedIds={mine.map((v) => v.pollId)} />
      </section>
    </div>
  );
}
