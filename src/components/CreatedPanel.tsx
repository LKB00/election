'use client';
import Link from 'next/link';
import { ArrowRight, Check, Link2, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/lang';
import { track } from '@/lib/track';
import { votePop } from '@/lib/sound';
import Burst from './Burst';
import Spot from './Spot';

// Right after creating a duel, the job is to send it (P1). Voting yourself is P2 (the duel is below).
export default function CreatedPanel({ id, title, path = `/p/${id}`, heading, text, button, manageHref }: { id: string; title: string; /** A pack's page instead of a poll's. */ path?: string; heading?: string; text?: string; button?: string; /** The maker's page for this poll (votes as they come in). */ manageHref?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  // Remove "?new=1" from the address bar, so a copied address or a refresh shows the normal page to friends.
  // and celebrate once: it is the creator's proudest moment (they made it), with a pop and a happy buzz.
  const [party, setParty] = useState(false);
  useEffect(() => {
    window.history.replaceState(null, '', path);
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setParty(true);
    votePop();
    navigator.vibrate?.([10, 60, 10]);
  }, [path]);
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
    if (navigator.share) {
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
      <p className="small muted">{t.createdNote}</p>
      <span className="row wrap">
        <button type="button" className="btn btn-primary btn-lg" onClick={share}><Share2 size={15} strokeWidth={1.75} aria-hidden /> {button ?? t.shareDuel}</button>
        <button type="button" className="btn btn-ghost btn-lg" onClick={copy}>
          {copied ? <Check size={15} strokeWidth={2} aria-hidden /> : <Link2 size={15} strokeWidth={1.75} aria-hidden />} {copied ? t.copied : t.copyLink}
        </button>
      </span>
      {/* Where to come back to: the maker's page (votes as they come in), also under You. */}
      {manageHref && (
        <Link href={manageHref} className="text-link small created-manage">
          {t.createdManage} <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
        </Link>
      )}
    </section>
  );
}
