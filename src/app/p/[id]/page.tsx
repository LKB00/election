import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import CreatedPanel from '@/components/CreatedPanel';
import DuelGame from '@/components/DuelGame';
import { getDb } from '@/db';
import { getDeck, getPoll } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';
import { getT } from '@/lib/lang-server';
import { dict, isLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; f?: string; s?: string; o?: string; l?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { f, s, o, l } = await searchParams;
  // The sender's language (from their link), so the chat preview reads like their message.
  const lang = isLang(l) ? l : 'en';
  const poll = await getPoll(await getDb(), id, null);
  if (!poll) return { title: 'Duel not found' };
  const names = poll.options.map((o) => o.label).join(' vs ');
  // The preview image says what the sender picked (from their share code), never the split.
  const image = `/api/og/${poll.id}${f ? `?f=${encodeURIComponent(f)}${s === '1' || !o ? '&s=1' : `&o=${encodeURIComponent(o)}`}${lang !== 'en' ? `&l=${lang}` : ''}` : ''}`;
  const title = f ? (s === '1' || !o ? dict[lang].ogTitleSecret(poll.title) : dict[lang].ogTitleOpen(poll.title)) : poll.title;
  return {
    title: poll.title,
    // Search engines only get duels the owner has checked (and never someone's personal share link).
    robots: poll.reviewed && !f ? undefined : { index: false, follow: true },
    alternates: { canonical: `/p/${poll.id}` },
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
  // Opened from inside the site (Duels list, a tile): nobody "wants your pick", so no label then.
  const h = await headers();
  let fromInside = false;
  try {
    fromInside = new URL(h.get('referer') ?? '').host === h.get('host');
  } catch {
    /* no referer: came from outside (WhatsApp, a typed link) */
  }
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
          : fromInside
            ? null
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
