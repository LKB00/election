'use client';
import Link from 'next/link';
import { ChevronRight, PenLine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/lang';

// "Your polls · 37 votes so far" (P2): people value what they made (the IKEA effect), and group admins who come back
// to check their poll are the ones who make the next one. The list lives only on this phone (no login); counts are real.
const KEY = 'election-my-polls';
const MANAGE = 'election-manage-keys';

/** Called after a poll is made: remember it on this phone (newest first, 20 at most). */
export function rememberMyPoll(id: string, manageKey?: string) {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[];
    localStorage.setItem(KEY, JSON.stringify([id, ...ids.filter((x) => x !== id)].slice(0, 20)));
    // The creator's private key: lets this phone mark a "Called it" result later.
    if (manageKey) {
      const keys = JSON.parse(localStorage.getItem(MANAGE) ?? '{}') as Record<string, string>;
      keys[id] = manageKey;
      localStorage.setItem(MANAGE, JSON.stringify(keys));
    }
  } catch {}
}
/** This phone's private key for a poll it created, if any. */
export function manageKeyFor(id: string): string | null {
  try {
    return (JSON.parse(localStorage.getItem(MANAGE) ?? '{}') as Record<string, string>)[id] ?? null;
  } catch {
    return null;
  }
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
    <section className="al-block" aria-label={t.yourPolls}>
      <h2 className="al-block__title">{t.yourPolls}</h2>
      <ul className="al-listcard">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/p/${r.id}`} className="al-row">
              <span className="al-row__disc" style={{ '--tone': 'var(--lime-badge)' } as React.CSSProperties}><PenLine size={20} strokeWidth={1.75} aria-hidden /></span>
              <span className="al-row__main">
                <span className="al-row__title">{r.title}</span>
                <span className="al-row__meta">{t.votesSoFar(r.votes)}</span>
              </span>
              <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
