'use client';
import { Check, Link2, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/lang';
import { votePop } from '@/lib/sound';
import Burst from './Burst';

// Right after creating a duel, the job is to send it (P1). Voting yourself is P2 (the duel is below).
export default function CreatedPanel({ id, title, path = `/p/${id}`, heading, text, button }: { id: string; title: string; /** A pack's page instead of a poll's. */ path?: string; heading?: string; text?: string; button?: string }) {
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
  const link = () => `${window.location.origin}${path}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.copyThis, link());
    }
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: text ?? t.shareTextAsk(title), url: link() });
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
      <h2>{heading ?? t.createdTitle}</h2>
      <p className="small muted">{t.createdNote}</p>
      <span className="row wrap">
        <button type="button" className="btn btn-primary btn-lg" onClick={share}><Share2 size={15} strokeWidth={1.75} aria-hidden /> {button ?? t.shareDuel}</button>
        <button type="button" className="btn btn-ghost btn-lg" onClick={copy}>
          {copied ? <Check size={15} strokeWidth={2} aria-hidden /> : <Link2 size={15} strokeWidth={1.75} aria-hidden />} {copied ? t.copied : t.copyLink}
        </button>
      </span>
    </section>
  );
}
