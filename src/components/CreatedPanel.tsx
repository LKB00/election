'use client';
import Link from 'next/link';
import { ArrowRight, Check, ImageDown, Link2, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLang, useT } from '@/lib/lang';
import { track } from '@/lib/track';
import { votePop } from '@/lib/sound';
import Burst from './Burst';
import Spot from './Spot';
import { shareMenu } from '@/lib/shareSheet';

// Right after creating a duel, the job is to send it (P1). Voting yourself is P2 (the duel is below).
export default function CreatedPanel({ id, title, path = `/p/${id}`, here = path, heading, note, text, button, manageHref, voteHref }: { id: string; /** The line under the heading. */ note?: string; title: string; /** A pack's page instead of a poll's. */ path?: string; /** The page this panel sits on (its address loses ?new=1). */ here?: string; heading?: string; text?: string; button?: string; /** The maker's page for this poll (votes as they come in). */ manageHref?: string; /** On the maker page: where to vote on it yourself. */ voteHref?: string }) {
  const t = useT();
  const lang = useLang();
  const [copied, setCopied] = useState(false);
  // A poll (not a pack) also gets a picture of the question for an Instagram / WhatsApp Story or a post (owner, Oct 2026:
  // "not only for friends: my Instagram or X audience"). Fetched now: iPhones open the share menu only straight from a tap.
  const isPoll = path === `/p/${id}`;
  const card = `/api/card/${id}?ask=1${lang === 'hg' ? '&l=hg' : ''}`;
  const [story, setStory] = useState<Blob | null>(null);
  useEffect(() => {
    if (!isPoll) return;
    let live = true;
    fetch(card).then((r) => (r.ok ? r.blob() : null)).then((b) => live && b && setStory(b)).catch(() => {});
    return () => {
      live = false;
    };
  }, [card, isPoll]);
  async function storyPicture() {
    track('share_open');
    try {
      const blob: Blob = story ?? (await fetch(card).then((r) => r.blob()));
      const file = new File([blob], 'chunav-poll.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${title} ${link('ig')}` });
        return;
      }
      // No share menu for pictures (most computers): save it, to post from the phone or the app.
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'chunav-poll.png';
      a.click();
      const href = a.href;
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch {
      // Closed the share menu, or no internet: nothing to undo.
    }
  }
  // Remove "?new=1" from the address bar, so a copied address or a refresh shows the normal page to friends.
  // and celebrate once: it is the creator's proudest moment (they made it), with a pop and a happy buzz.
  const [party, setParty] = useState(false);
  useEffect(() => {
    window.history.replaceState(null, '', here);
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setParty(true);
    votePop();
    navigator.vibrate?.([10, 60, 10]);
  }, [here]);
  // Tagged so the maker's page can count where votes came from (copied link vs. the share menu).
  const link = (src = 'link') => `${window.location.origin}${path}?src=${src}`;
  async function copy() {
    track('copy_link');
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.copyThis, link());
    }
  }
  async function share() {
    track('share_open');
    if (shareMenu()) {
      try {
        await navigator.share({ title, text: text ?? t.shareTextAsk(title), url: link('other') });
      } catch (e) {
        // Closed the phone's share menu: done. Only a real failure falls back to copying the link.
        if ((e as Error)?.name !== 'AbortError') copy();
      }
      return;
    }
    copy();
  }
  return (
    <section className="duel-created" aria-label={heading ?? t.createdTitle}>
      {party && <Burst count={24} />}
      {/* The proudest moment gets its own picture: the slip goes in, the box is sealed: it is live. */}
      <Spot kind="live" size={132} />
      <h2>{heading ?? t.createdTitle}</h2>
      <p className="small muted">{note ?? t.createdNote}</p>
      {/* Said up front, so a poll missing from the Polls list never looks like a bug (owner, Oct 2026). */}
      <span className="row wrap">
        <button type="button" className="btn btn-primary btn-lg" onClick={share}><Share2 size={15} strokeWidth={1.75} aria-hidden /> {button ?? t.shareDuel}</button>
        <button type="button" className="btn btn-ghost btn-lg" onClick={copy}>
          {copied ? <Check size={15} strokeWidth={2} aria-hidden /> : <Link2 size={15} strokeWidth={1.75} aria-hidden />} {copied ? t.copied : t.copyLink}
        </button>
        {isPoll && <button type="button" className="btn btn-ghost btn-lg" onClick={storyPicture}><ImageDown size={15} strokeWidth={1.75} aria-hidden /> {t.storyPicture}</button>}
      </span>
      {/* Where to come back to: the maker's page (votes as they come in), also under You. */}
      {voteHref && (
        <Link href={voteHref} className="text-link small created-manage">
          {t.createdVote} <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
        </Link>
      )}
      {manageHref && (
        <Link href={manageHref} className="text-link small created-manage">
          {t.createdManage} <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
        </Link>
      )}
    </section>
  );
}
