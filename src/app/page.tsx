import Link from 'next/link';
import { getDb } from '@/db';
import { listPolls } from '@/lib/polls';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const polls = await listPolls(await getDb());
  return (
    <>
      <section className="hero">
        <span className="label">Fun polls · not official results</span>
        <h1>Who wins? You decide.</h1>
        <p className="lead">Pick two or more choices, share the link, and watch the votes come in. Virat, Rohit or Dhoni? Pizza or biryani?</p>
        <Link href="/create" className="btn btn-primary btn-lg">Create a poll</Link>
      </section>

      <h2 style={{ marginTop: 32 }}>Latest polls</h2>
      {polls.length === 0 ? (
        <div className="card empty">No polls yet. Be the first to make one.</div>
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
    </>
  );
}
