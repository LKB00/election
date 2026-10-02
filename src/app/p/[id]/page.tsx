import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CreatedPanel from '@/components/CreatedPanel';
import DuelGame from '@/components/DuelGame';
import { getDb } from '@/db';
import { getDeck, getPoll } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';
import { getT } from '@/lib/lang-server';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; f?: string; s?: string; l?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { f, s, l } = await searchParams;
  const hi = l === 'hi';
  const poll = await getPoll(await getDb(), id, null);
  if (!poll) return { title: 'Duel not found' };
  const names = poll.options.map((o) => o.label).join(' vs ');
  // The preview image says what the sender picked (from their share code), never the split.
  const image = `/api/og/${poll.id}${f ? `?f=${encodeURIComponent(f)}${s === '1' ? '&s=1' : ''}${hi ? '&l=hi' : ''}` : ''}`;
  const title = f
    ? hi
      ? s === '1' ? `मैंने “${poll.title}” में वोट किया। बताओ किसे चुना?` : `मैंने “${poll.title}” में वोट किया। आप किसे चुनेंगे?`
      : s === '1' ? `I voted in “${poll.title}”. Guess who I picked?` : `I voted in “${poll.title}”. Who would you pick?`
    : poll.title;
  return {
    title: poll.title,
    description: `${names}. Who would you pick? Tap to vote.`,
    openGraph: { title, description: `${names}. Vote in one tap and see where everyone stands.`, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', images: [image] },
  };
}

// A shared link: that duel first. Docs: docs/DESIGN.md (Flow 2, J2).
export default async function DuelPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { new: isNew, f } = await searchParams;
  const justCreated = isNew === '1';
  const db = await getDb();
  const t = await getT();
  const voterId = await readVoterId();
  const poll = await getPoll(db, id, voterId, f);
  if (!poll) notFound();
  const rest = await getDeck(db, voterId);
  const deck = [poll, ...rest.filter((p) => p.id !== poll.id)];
  // The label says why you are here: you made it, a friend dared you, you already voted, or it is over.
  // Just created: no label, the panel below already says it.
  const label = justCreated
    ? null
    : poll.closed
      ? t.labelEnded
      : poll.myVote
        ? t.labelVoted
        : poll.friend.known
          ? t.labelDared
          : t.labelAsk;
  // (Friend: the label says why you are here; the line in the game holds the hook, "their pick is sealed".)
  return (
    <div className="page page-wide">
      {label && <p className="eyebrow">{label}</p>}
      {justCreated && <CreatedPanel id={poll.id} title={poll.title} />}
      <section className="home-game duel-first" aria-label="Duel">
        <DuelGame deck={deck} start={0} via={f ?? null} />
      </section>
    </div>
  );
}
