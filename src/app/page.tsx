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
        <section className="hero-home">
          <span className="label">Fun polls · not official results</span>
          <h1>Who wins? You decide.</h1>
        </section>
      )}

      <div className="section-head">
        <h2>Next duels</h2>
        <Link href="/create" className="small">Create yours →</Link>
      </div>
      <div className="next-row">
        {polls.map((p) => (
          <Link key={p.id} href={`/p/${p.id}`} className="next-card">
            <div className="poll-meta">
              <span className="chip">{p.category}</span>
              <span className={'chip ' + (p.closed ? 'chip-closed' : 'chip-live')}>{p.closed ? 'Ended' : 'Live'}</span>
            </div>
            <h3>{p.title}</h3>
            <div className="next-vs">{p.options.slice(0, 4).map((o) => <span key={o}>{o}</span>)}</div>
            <p className="small">{p.totalVotes} {p.totalVotes === 1 ? 'vote' : 'votes'}</p>
          </Link>
        ))}
        <Link href="/create" className="next-card next-create">
          <h3>+ New duel</h3>
          <p className="small">Make your own poll in 30 seconds</p>
        </Link>
      </div>

      <div className="cta-card">
        <h2>Got your own debate?</h2>
        <p>Virat or Rohit? Pizza or biryani? Make a poll in 30 seconds.</p>
        <Link href="/create" className="btn btn-primary btn-lg">Create a poll</Link>
      </div>
    </>
  );
}
