import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import DuelGame from '@/components/DuelGame';
import DuelTiles from '@/components/DuelTiles';
import { getDb } from '@/db';
import { getDeck, getVoterStats, listPolls } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';

export const dynamic = 'force-dynamic';

// Home = vote in one tap. Nothing sits above the duel except a 4-word label.
// The why for every element is in docs/DESIGN.md (Flow 1).
export default async function Home() {
  const db = await getDb();
  const voterId = await readVoterId();
  const [deck, stats, polls] = await Promise.all([getDeck(db, voterId), getVoterStats(db, voterId), listPolls(db, 8)]);
  const voted = deck.filter((p) => p.myVote !== null).map((p) => p.id);

  return (
    <div className="page page-wide">
      <p className="eyebrow">Fun duels · not official results</p>

      {deck.length > 0 && (
        <section className="home-game duel-first" aria-label="Duel">
          <DuelGame deck={deck} />
        </section>
      )}


      <section className="block">
        <div className="row space-between">
          <h2>More duels</h2>
          <Link href="/duels" className="text-link">All duels <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></Link>
        </div>
        <DuelTiles polls={polls} votedIds={voted} />
      </section>
    </div>
  );
}
