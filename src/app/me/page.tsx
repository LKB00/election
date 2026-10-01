import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import { getDb } from '@/db';
import { getMyVotes, getVoterStats } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Me' };

// Same shapes as patricka's Me page: level card, today card, list.
const LEVELS = [
  [0, 'Newcomer'],
  [3, 'Voter'],
  [10, 'Regular'],
  [25, 'Opinion maker'],
  [50, 'Duel master'],
  [100, 'Legend'],
] as const;

export default async function Me() {
  const db = await getDb();
  const voterId = await readVoterId();
  const [stats, mine] = await Promise.all([getVoterStats(db, voterId), getMyVotes(db, voterId)]);
  const idx = [...LEVELS].reverse().findIndex(([min]) => stats.votes >= min);
  const levelNum = LEVELS.length - idx;
  const [floor, name] = LEVELS[levelNum - 1];
  const next = LEVELS[levelNum];
  const pct = next ? ((stats.votes - floor) / (next[0] - floor)) * 100 : 100;

  return (
    <div className="page">
      <header className="page-head page-head-tight">
        <h1 className="display">Me</h1>
      </header>
      <div className="level-card">
        <div className="level-top">
          <span className="level-badge">{levelNum}</span>
          <div>
            <p className="label">Level {levelNum}</p>
            <p className="level-name">{name}</p>
          </div>
          <p className="level-xp"><Check size={16} strokeWidth={2.5} aria-hidden /> {stats.votes} {stats.votes === 1 ? 'vote' : 'votes'}</p>
        </div>
        <span className="meter meter-xp" aria-hidden><span style={{ width: `${pct}%` }} /></span>
        <p className="small muted">{next ? `${next[0] - stats.votes} more ${next[0] - stats.votes === 1 ? 'vote' : 'votes'} to ${next[1]}` : 'Top level. Legendary.'}</p>
        <ul className="level-stats">
          <li><strong>{stats.votes}</strong> duels voted</li>
          <li><strong>{stats.correct}/{stats.guesses}</strong> right guesses</li>
          <li><strong>{stats.guesses ? Math.round((stats.correct / stats.guesses) * 100) : 0}%</strong> crowd reading</li>
          <li><strong>{stats.friends}</strong> {stats.friends === 1 ? 'friend' : 'friends'} answered your dares</li>
        </ul>
      </div>

      <section className="block">
        <h2>Your votes</h2>
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
