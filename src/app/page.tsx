import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import DuelBanner from '@/components/DuelBanner';
import DuelGame from '@/components/DuelGame';
import DuelTiles from '@/components/DuelTiles';
import TodayCard from '@/components/Today';
import { getDb } from '@/db';
import { getDeck, getVoterStats, listPolls } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';

export const dynamic = 'force-dynamic';

// Home = vote in one second. The first duel starts right here (like patricka's home game).
export default async function Home() {
  const db = await getDb();
  const voterId = await readVoterId();
  const [deck, stats, polls] = await Promise.all([getDeck(db, voterId), getVoterStats(db, voterId), listPolls(db, 8)]);
  const featured = deck.find((p) => p.featured) ?? null;
  const voted = deck.filter((p) => p.myVote !== null).map((p) => p.id);

  return (
    <div className="page page-wide">
      <header className="home-hero">
        <p className="eyebrow">Fun duels · not official results</p>
        <h1 className="display display-xl">Who would you pick?</h1>
        <p className="lead">Quick head-to-head duels. Tap your pick and see where everyone stands.</p>
        {stats.votes > 0 && (
          <p className="home-me">
            You voted in <strong>{stats.votes}</strong> {stats.votes === 1 ? 'duel' : 'duels'}{stats.streak > 0 && ` · 🔥 ${stats.streak}-day streak`} · <Link href="/me">Your votes</Link>
          </p>
        )}
      </header>

      {deck.length > 0 && (
        <section className="home-game" aria-label="Duels">
          <DuelGame deck={deck} />
        </section>
      )}

      <section className="block">
        <TodayCard initial={stats} />
      </section>

      {featured && (
        <section className="block">
          <DuelBanner poll={featured} />
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
