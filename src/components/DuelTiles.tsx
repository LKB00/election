import Link from 'next/link';
import { Check, Plus, Users } from 'lucide-react';
import type { PollSummary } from '@/lib/polls';

// One pastel tile per duel, like patricka's game tiles.
const TONES = ['game-e', 'game-f', 'game-b', 'game-d', 'game-a'];

export default function DuelTiles({ polls, votedIds = [] }: { polls: PollSummary[]; votedIds?: string[] }) {
  return (
    <div className="games">
      <Link href="/create" className="game game-c">
        <Plus size={22} strokeWidth={1.75} aria-hidden />
        <strong>Start your own duel</strong>
        <span>Virat or Rohit? Pizza or biryani? Make one in 30 seconds.</span>
        <span className="game-meta">Free · no sign-up</span>
      </Link>
      {polls.map((p, n) => {
        const done = votedIds.includes(p.id);
        return (
          <Link key={p.id} href={`/p/${p.id}`} className={`game ${TONES[n % TONES.length]}`}>
            {n < 2 && !done && <span className="game-new">New</span>}
            <Users size={22} strokeWidth={1.75} aria-hidden />
            <strong>{p.title}</strong>
            <span>{p.options.join(' vs ')}</span>
            <span className="game-meta">
              {done ? <><Check size={13} strokeWidth={2} aria-hidden /> You voted</> : <>{p.totalVotes} {p.totalVotes === 1 ? 'vote' : 'votes'} · {p.closed ? 'ended' : 'live'}</>}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
