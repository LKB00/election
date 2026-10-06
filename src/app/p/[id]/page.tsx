import { ArrowRight, Check, ChevronRight, Clock, SlidersHorizontal, Users, Vote } from 'lucide-react';
import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { ownPoll } from '@/lib/maker';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import CreatedPanel from '@/components/CreatedPanel';
import PollIntro from '@/components/PollIntro';
import DuelGame from '@/components/DuelGame';
import Step from '@/components/Step';
import { getDb } from '@/db';
import { SITE_URL } from '@/lib/site';
import { getDeck, getMyVotes, getPoll, INDEX_MIN_VOTES, listPolls } from '@/lib/polls';
import DuelTiles from '@/components/DuelTiles';
import { readVoterId } from '@/lib/voter';
import { getT, langAlternates } from '@/lib/lang-server';


import { dict, isLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; f?: string; s?: string; o?: string; l?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { f, s, o, l } = await searchParams;
  // The sender's language (from their link), so the chat preview reads like their message.
  const lang = isLang(l) ? l : 'en';
  const t = dict[lang];
  const poll = await getPoll(await getDb(), id, null);
  if (!poll) return { title: t.notFound };
  const names = poll.options.map((o) => o.label).join(' vs ');
  // The preview image says what the sender picked (from their share code), never the split.
  const image = `/api/og/${poll.id}${f ? `?f=${encodeURIComponent(f)}${s === '1' || !o ? '&s=1' : `&o=${encodeURIComponent(o)}`}${lang !== 'en' ? `&l=${lang}` : ''}` : ''}`;
  const title = f ? (s === '1' || !o ? t.ogTitleSecret(poll.title) : t.ogTitleOpen(poll.title)) : poll.title;
  return {
    title: poll.title,
    // Search engines only get polls the owner has checked that enough people voted in (a thin page with two votes
    // looks like spam to Google), and never someone's personal share link.
    robots: poll.reviewed && !f && poll.participants >= INDEX_MIN_VOTES ? undefined : { index: false, follow: true },
    alternates: await langAlternates(`/p/${poll.id}`),
    description: t.metaPollDesc(names),
    openGraph: { title, description: t.metaPollOg(names), images: [{ url: image, width: 1200, height: 630 }] },
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
  const [rest, user, recent, myVotes] = await Promise.all([getDeck(db, voterId), currentUser(db), listPolls(db, 20), getMyVotes(db, voterId, 200)]);
  // Computers only: a few other open polls beside this one (hidden on phones, where Next leads to them one by one).
  const others = recent.filter((p) => !p.closed && p.id !== poll.id).slice(0, 5);
  // The poll's maker gets a way to their tools (votes so far, end it, results picture).
  const mine = !!user && !!(await ownPoll(db, poll.id, user.id));
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
          : fromInside || poll.maker || mine
            ? null
            : t.labelAsk;
  // (Friend: the label says why you are here; the line in the game holds the hook, "their pick is sealed".)
  // For search engines (structured data): the question and its choices. Vote numbers only when anyone may see them
  // (never when results wait until after voting: they would leak to everyone reading the page source).
  const publicCounts = poll.resultsVisible && !poll.myVote;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: poll.title,
    text: [poll.description, poll.options.map((o) => o.label).join(' · ')].filter(Boolean).join(' — '),
    url: `${SITE_URL}/p/${poll.id}`,
    ...(publicCounts ? { interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/VoteAction', userInteractionCount: poll.participants } } : {}),
  };
  return (
    <div className={'page page-wide' + (others.length ? ' poll-grid' : '')}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <Step e="poll_view" sharedCheck />
      <div className="poll-main">
      <PollIntro pollId={poll.id}>
      {label && (
        <p className={'eyebrow' + (!poll.myVote && !poll.closed ? ' poll-ask' : '')}>
          {/* Arogya's chip: an icon with the word. */}
          {poll.closed ? <Clock size={13} strokeWidth={2} aria-hidden /> : poll.myVote ? <Check size={13} strokeWidth={2.25} aria-hidden /> : poll.friend.known ? <Users size={13} strokeWidth={2} aria-hidden /> : <Vote size={13} strokeWidth={2} aria-hidden />}
          {label}
        </p>
      )}
      {justCreated && <CreatedPanel id={poll.id} title={poll.title} manageHref={`/p/${poll.id}/manage`} held={poll.heldForReview} />}
      {mine && !justCreated && (
        <Link href={`/p/${poll.id}/manage`} className="maker-bar">
          <SlidersHorizontal size={16} strokeWidth={2} aria-hidden /> {t.manageLink}
          <ChevronRight size={16} strokeWidth={2} aria-hidden />
        </Link>
      )}
      {poll.maker && (
        <Link href={`/u/${poll.maker.id}`} className="maker-by">
          <span className="maker-by-face" aria-hidden>{poll.maker.avatar}</span> {t.askedBy(poll.maker.name)}
        </Link>
      )}
      </PollIntro>
      <section className="home-game duel-first" aria-label={t.pollRegion}>
        <DuelGame deck={deck} start={0} via={f ?? null} ownId={mine ? poll.id : undefined} />
      </section>
      </div>
      {/* Computers (election.css, "Desktop"): the poll on the left, a few more to vote on in a column on the right, the
          same shape as Home. Phones never show this column. */}
      {others.length > 0 && (
        <aside className="poll-rail" aria-label={t.moreDuels}>
          <section className="al-block">
            <h2 className="al-block__title">
              {t.moreDuels}
              <Link href="/polls" className="al-block__aside">{t.allDuels} <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></Link>
            </h2>
            <DuelTiles polls={others} votedIds={myVotes.map((v) => v.pollId)} noCreate />
          </section>
        </aside>
      )}
    </div>
  );
}
