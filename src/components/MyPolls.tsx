'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/lang';

// "Your polls · 37 votes so far" (P2): people value what they made (the IKEA effect), and group admins who come back
// to check their poll are the ones who make the next one. The list lives only on this phone (no login); counts are real.
const KEY = 'election-my-polls';

/** Called after a poll is made: remember it on this phone (newest first, 20 at most). */
export function rememberMyPoll(id: string) {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[];
    localStorage.setItem(KEY, JSON.stringify([id, ...ids.filter((x) => x !== id)].slice(0, 20)));
  } catch {}
}

export default function MyPolls() {
  const t = useT();
  const [rows, setRows] = useState<{ id: string; title: string; votes: number }[]>([]);
  useEffect(() => {
    let live = true;
    let ids: string[] = [];
    try {
      ids = (JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown[]).filter((x): x is string => typeof x === 'string' && /^[\w-]{1,40}$/.test(x)).slice(0, 3);
    } catch {}
    if (!ids.length) return;
    Promise.all(ids.map((id) => fetch(`/api/polls/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null))).then((polls) => {
      if (live) setRows(polls.filter(Boolean).map((p) => ({ id: p.id, title: p.title, votes: p.participants })));
    });
    return () => {
      live = false;
    };
  }, []);
  if (!rows.length) return null;
  return (
    <section className="block my-polls" aria-label={t.yourPolls}>
      <p className="label">{t.yourPolls}</p>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/p/${r.id}`} className="day-q">{r.title}</Link>
            <span className="small muted">{t.votesSoFar(r.votes)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
