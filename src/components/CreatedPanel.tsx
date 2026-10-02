'use client';
import { Check, Link2, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/lang';

// Right after creating a duel, the job is to send it (P1). Voting yourself is P2 (the duel is below).
export default function CreatedPanel({ id, title }: { id: string; title: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  // Remove "?new=1" from the address bar, so a copied address or a refresh shows the normal page to friends.
  useEffect(() => {
    window.history.replaceState(null, '', `/p/${id}`);
  }, [id]);
  const link = () => `${window.location.origin}/p/${id}`;
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
        await navigator.share({ title, text: t.shareTextAsk(title), url: link() });
        return;
      } catch {
        /* closed */
      }
    }
    copy();
  }
  return (
    <section className="duel-created" aria-label={t.createdTitle}>
      <h2>{t.createdTitle}</h2>
      <p className="small muted">{t.createdNote}</p>
      <span className="row wrap">
        <button type="button" className="btn btn-primary btn-lg" onClick={share}><Share2 size={15} strokeWidth={1.75} aria-hidden /> {t.shareDuel}</button>
        <button type="button" className="btn btn-ghost btn-lg" onClick={copy}>
          {copied ? <Check size={15} strokeWidth={2} aria-hidden /> : <Link2 size={15} strokeWidth={1.75} aria-hidden />} {copied ? t.copied : t.copyLink}
        </button>
      </span>
    </section>
  );
}
