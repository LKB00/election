import type { Metadata } from 'next';
import MyPolls from '@/components/MyPolls';
import { getT } from '@/lib/lang-server';

export const metadata: Metadata = { title: 'My polls', robots: { index: false } };

// My polls: the polls made on this phone, with their live vote counts (creators come back to see how theirs is doing).
// The list lives on this phone only (no login), like My votes.
export default async function MinePage() {
  const t = await getT();
  return (
    <div className="page">
      <header className="page-head page-head-tight">
        <h1 className="display">{t.myPolls}</h1>
        <p className="lead">{t.myPollsLead}</p>
      </header>
      <section className="block">
        <MyPolls page />
      </section>
      <p className="small muted block-tight">{t.myPollsDevice}</p>
    </div>
  );
}
