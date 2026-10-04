'use client';
import { useState } from 'react';
import { useT } from '@/lib/lang';

// The owner's "Today's question" picker on /admin: the current one, then the newest polls with one button each.
export default function TodayPicker({ current, polls, adminKey }: { current: { id: string; title: string } | null; polls: { id: string; title: string }[]; adminKey: string }) {
  const t = useT();
  const [today, setToday] = useState(current);
  const [busy, setBusy] = useState<string | null>(null);
  async function pick(p: { id: string; title: string }) {
    setBusy(p.id);
    const res = await fetch(`/api/admin/${p.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: adminKey, action: 'today' }),
    }).catch(() => null);
    if (res?.ok) setToday(p);
    setBusy(null);
  }
  return (
    <section className="block" aria-label={t.todaysQuestion}>
      <h2>{t.todaysQuestion}</h2>
      {today && <p className="small"><strong>{t.adminIsToday}:</strong> {today.title}</p>}
      <p className="small muted">{t.adminTodayLead}</p>
      {/* The one link to post every day: it always opens today's question. */}
      <p className="small">{t.adminTodayLink} <code suppressHydrationWarning>{typeof window !== 'undefined' ? `${window.location.origin}/today` : '/today'}</code></p>
      <ul className="index-list block-tight">
        {polls.filter((p) => p.id !== today?.id).map((p) => (
          <li key={p.id} className="today-pick">
            <span className="index-title">{p.title}</span>
            <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={() => pick(p)}>{t.adminMakeToday}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
