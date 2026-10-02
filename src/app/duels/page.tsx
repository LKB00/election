import type { Metadata } from 'next';
import DuelBanner from '@/components/DuelBanner';
import DuelTiles from '@/components/DuelTiles';
import { getDb } from '@/db';
import { getFeaturedId, getMyVotes, getPoll, getVoterStats, listPolls } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Duels' };

// P1: the duel of the day (dark banner). P2: browse the tiles. P3: your progress.
export default async function Duels() {
  const db = await getDb();
  const voterId = await readVoterId();
  const featuredId = await getFeaturedId(db);
  const [featured, polls, stats, mine] = await Promise.all([
    featuredId ? getPoll(db, featuredId, voterId) : Promise.resolve(null),
    listPolls(db, 60),
    getVoterStats(db, voterId),
    getMyVotes(db, voterId, 200),
  ]);
  return (
    <div className="page page-wide">
      <header className="page-head">
        <h1 className="display">Duels</h1>
        <p className="lead">Vote, see the split, dare your friends.</p>
      </header>
      {/* Not voted yet: the duel of the day is the main thing here. Voted: it steps back below the duels you have not done. */}
      {featured && featured.myVote === null && (
        <section className="block block-tight">
          <DuelBanner poll={featured} />
        </section>
      )}
      <section className="block">
        {/* A heading only when the banner sits above; otherwise it would just repeat the page title. */}
        {featured && featured.myVote === null && <h2>All duels</h2>}
        <DuelTiles polls={polls} votedIds={mine.map((v) => v.pollId)} />
      </section>
      {featured && featured.myVote !== null && (
        <section className="block">
          <DuelBanner poll={featured} />
        </section>
      )}
    </div>
  );
}
