'use client';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/lib/lang';

// TEMPORARY (owner's testing): makes this phone a first-time visitor again. Removes this phone's votes, exit poll calls
// and reactions, and everything the site remembered in the browser (sound switch, "seen" results). Only this phone:
// other people's votes and the duels stay. To remove: delete this file and its one line in src/app/me/page.tsx.
export default function ResetFresh() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  async function reset() {
    if (busy || !window.confirm(t.resetConfirm)) return;
    setBusy(true);
    const res = await fetch('/api/me/delete', { method: 'POST' }).catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      window.alert(t.errGeneric);
      return;
    }
    try {
      // Everything this phone remembers about voting, but never a poll maker's private keys or their list of polls
      // (those would lose the polls they made here).
      const keep = new Set(['election-manage-keys', 'election-my-polls']);
      Object.keys(localStorage).forEach((k) => keep.has(k) || localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {
      /* private mode */
    }
    window.location.href = '/';
  }
  return (
    <section className="block reset-fresh" aria-label={t.resetTitle}>
      <p className="label">{t.resetTitle}</p>
      <p className="small muted">{t.resetNote}</p>
      <button type="button" className="btn btn-ghost" onClick={reset} disabled={busy}>
        <RotateCcw size={14} strokeWidth={1.75} aria-hidden /> {busy ? t.resetBusy : t.resetButton}
      </button>
    </section>
  );
}
