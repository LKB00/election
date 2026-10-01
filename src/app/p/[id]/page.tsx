import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CreatedPanel from '@/components/CreatedPanel';
import DuelGame from '@/components/DuelGame';
import TodayCard from '@/components/Today';
import { getDb } from '@/db';
import { getDeck, getPoll, getVoterStats } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const poll = await getPoll(await getDb(), (await params).id, null);
  if (!poll) return { title: 'Duel not found' };
  const names = poll.options.map((o) => o.label).join(' vs ');
  return {
    title: poll.title,
    description: `${names}. Who would you pick? Tap to vote.`,
    openGraph: { title: poll.title, description: `${names}. Who would you pick?` },
    twitter: { card: 'summary_large_image' },
  };
}

// A shared link: the friend's duel first. Docs: docs/DESIGN.md (Flow 2).
export default async function DuelPage({ params, searchParams }: Props) {
  const { id } = await params;
  const justCreated = (await searchParams).new === '1';
  const db = await getDb();
  const voterId = await readVoterId();
  const poll = await getPoll(db, id, voterId);
  if (!poll) notFound();
  const [rest, stats] = await Promise.all([getDeck(db, voterId), getVoterStats(db, voterId)]);
  const deck = [poll, ...rest.filter((p) => p.id !== poll.id)];
  return (
    <div className="page page-wide">
      {/* The label says why you are here: you made it, a friend sent it, or it is over. */}
      <p className="eyebrow">{justCreated ? 'Your duel is ready' : poll.closed ? 'This duel has ended' : poll.myVote ? 'You already voted here' : 'Someone wants your pick'}</p>
      {justCreated && <CreatedPanel id={poll.id} title={poll.title} />}
      <section className="home-game duel-first" aria-label="Duel">
        <DuelGame deck={deck} start={0} />
      </section>
      <TodayCard initial={stats} hideUntilVoted />
    </div>
  );
}
