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
        <h2>More polls</h2>
        <span className="small">Latest first</span>
      </div>
      {polls.length === 0 ? (
        <div className="card empty">No other polls yet. Start one and send it to your friends.</div>
      ) : (
        <div className="poll-list">
          {polls.map((p) => (
            <Link key={p.id} href={`/p/${p.id}`} className="card poll-item">
              <div className="poll-meta">
                <span className="chip">{p.category}</span>
                <span className={'chip ' + (p.closed ? 'chip-closed' : 'chip-live')}>{p.closed ? 'Ended' : 'Live'}</span>
                <span className="small">{p.totalVotes} {p.totalVotes === 1 ? 'vote' : 'votes'}</span>
              </div>
              <h3>{p.title}</h3>
              <p className="small">{p.options.join(' · ')}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="cta-card">
        <h2>Got your own debate?</h2>
        <p>Virat or Rohit? Pizza or biryani? Make a poll in 30 seconds.</p>
        <Link href="/create" className="btn btn-primary btn-lg">Create a poll</Link>
      </div>
    </>
  );
}
