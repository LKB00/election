'use client';
import { useRouter } from 'next/navigation';
import { Check, Link2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/lib/lang';

// My votes, P3: keep your record (a private link for a new phone) or delete it. Both are privacy rights, so always here.
export default function KeepVotes({ voterKey }: { voterKey: string | null }) {
  const t = useT();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const link = () => `${window.location.origin}/api/me/restore?k=${encodeURIComponent(voterKey ?? '')}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.copyThis, link());
    }
  }
  async function remove() {
    if (busy || !window.confirm(t.deleteConfirm)) return;
    setBusy(true);
    const res = await fetch('/api/me/delete', { method: 'POST' }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      router.replace('/me?deleted=1');
      router.refresh();
    }
  }

  if (!voterKey) return null;
  return (
    <section className="block keep-votes" aria-label={t.keepTitle}>
      <h2>{t.keepTitle}</h2>
      <p className="small muted">{t.keepNote}</p>
      <span className="row wrap">
        <button type="button" className="btn btn-ghost" onClick={copy}>
          {copied ? <Check size={14} strokeWidth={2} aria-hidden /> : <Link2 size={14} strokeWidth={1.75} aria-hidden />} {copied ? t.copied : t.keepCopy}
        </button>
        <button type="button" className="link-like small muted" onClick={remove} disabled={busy}>
          <Trash2 size={13} strokeWidth={1.75} aria-hidden /> {t.deleteMine}
        </button>
      </span>
    </section>
  );
}
