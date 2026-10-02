import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getDb } from '@/db';
import { getMyVotes, getVoterStats } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';
import { getT } from '@/lib/lang-server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My votes' };

// My votes = your voting record on this phone. No levels or points: nothing here that a real election does not have.
export default async function MyVotes() {
  const db = await getDb();
  const voterId = await readVoterId();
  const [stats, mine] = await Promise.all([getVoterStats(db, voterId), getMyVotes(db, voterId)]);
  const t = await getT();

  return (
    <div className="page">
      <header className="page-head page-head-tight">
        <h1 className="display">{t.myVotes}</h1>
        {stats.votes > 0 && (
          <p className="lead">{t.record(stats.votes, stats.guesses, stats.correct, stats.friends)}</p>
        )}
      </header>

      <section className="block">
        {mine.length === 0 ? (
          <p className="muted">{t.noVotes} <Link href="/" className="text-link">{t.startToday}</Link></p>
        ) : (
          <ul className="index-list block-tight">
            {mine.map((v) => (
              <li key={v.pollId}>
                <Link href={`/p/${v.pollId}`} className="index-row">
                  <span className="index-title">{v.title}</span>
                  <span className="index-sum">{t.youPicked(v.pick)}</span>
                  <ChevronRight size={16} strokeWidth={1.75} className="index-chev" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="small muted block-tight">{t.deviceOnly}</p>
      </section>
    </div>
  );
}
