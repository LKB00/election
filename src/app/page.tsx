import Link from 'next/link';
import Duel from '@/components/Duel';
import { getDb } from '@/db';
import { getFeaturedId, getPoll, listPolls } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const db = await getDb();
  const [featuredId, polls, voterId] = await Promise.all([getFeaturedId(db), listPolls(db), readVoterId()]);
  const featured = featuredId ? await getPoll(db, featuredId, voterId) : null;

  return (
    <>
      {featured && featured.options.length === 2 ? (
        <Duel initial={featured} headingLevel="h1" />
      ) : (
        <header className="hero">
          <p className="eyebrow">Fun polls · not official results</p>
          <h1 className="hero-title">Who wins? You decide.</h1>
        </header>
      )}

      <div className="section-head">
        <h2>Up next</h2>
        <Link href="/create">Start a duel →</Link>
      </div>
      <div className="next-row">
        <Link href="/create" className="next-card next-create">
          <h3>Your own duel</h3>
          <p>Virat or Rohit? Pizza or biryani? Make it in 30 seconds.</p>
        </Link>
        {polls.map((p) => (
          <Link key={p.id} href={`/p/${p.id}`} className="next-card">
            <h3>{p.title}</h3>
            <div className="next-vs">{p.options.slice(0, 3).map((o) => <span key={o}>{o}</span>)}</div>
            <span className="next-meta">{p.closed ? 'Ended' : 'Live'} · {p.totalVotes} {p.totalVotes === 1 ? 'vote' : 'votes'}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
