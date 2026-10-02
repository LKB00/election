import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getDb } from '@/db';
import { getMyVotes, getVoterStats } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My votes' };

// My votes = your voting record on this phone. No levels or points: nothing here that a real election does not have.
export default async function MyVotes() {
  const db = await getDb();
  const voterId = await readVoterId();
  const [stats, mine] = await Promise.all([getVoterStats(db, voterId), getMyVotes(db, voterId)]);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return (
    <div className="page">
      <header className="page-head page-head-tight">
        <h1 className="display">My votes</h1>
        {stats.votes > 0 && (
          <p className="lead">
            You voted in {plural(stats.votes, 'duel', 'duels')}
            {stats.guesses > 0 && `. Your exit poll calls: ${stats.correct} of ${stats.guesses} right`}
            {stats.friends > 0 && `. ${plural(stats.friends, 'friend', 'friends')} voted from your link`}.
          </p>
        )}
      </header>

      <section className="block">
        {mine.length === 0 ? (
          <p className="muted">No votes yet. <Link href="/" className="text-link">Start with today’s duel</Link></p>
        ) : (
          <ul className="index-list block-tight">
            {mine.map((v) => (
              <li key={v.pollId}>
                <Link href={`/p/${v.pollId}`} className="index-row">
                  <span className="index-title">{v.title}</span>
                  <span className="index-sum">You picked {v.pick}</span>
                  <ChevronRight size={16} strokeWidth={1.75} className="index-chev" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="small muted block-tight">Your votes are saved on this device only (no account). Just for fun, not an official poll.</p>
      </section>
    </div>
  );
}
