'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/lang';
import { LIST_FIRST } from '@/lib/limits';
import type { MyVote, Standing } from '@/lib/polls';

// "Since you last looked" on Your votes (owner, Oct 2026: a reason to come back, no streaks or notifications): what
// changed in the polls you voted in since this phone last opened this page. The last look is kept on this phone only.
const KEY = 'chunav-seen';
const SEP = '\u241F';
const sig = (s: Standing) => [s.kind, 'name' in s ? s.name : '', 'right' in s ? String(s.right) : ''].join(SEP);

export default function SinceLooked({ votes }: { votes: MyVote[] }) {
  const t = useT();
  const [rows, setRows] = useState<{ id: string; text: string }[]>([]);
  useEffect(() => {
    let seen: Record<string, string> = {};
    try {
      seen = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
    } catch {}
    const out: { id: string; text: string }[] = [];
    for (const v of votes) {
      const before = seen[v.pollId];
      const now = v.standing;
      if (before === undefined || before === sig(now)) continue;
      const [was, wasName] = before.split(SEP);
      if (now.kind === 'won') out.push({ id: v.pollId, text: t.sinceWon(now.name, v.title) });
      else if (now.kind === 'called') out.push({ id: v.pollId, text: t.sinceCalled(v.title, now.right) });
      else if (now.kind === 'tie' || now.kind === 'tied') out.push({ id: v.pollId, text: t.sinceTie(v.title) });
      else if (now.kind === 'leading' && was !== 'leading') out.push({ id: v.pollId, text: t.sinceOpen(v.title) });
      else if (now.kind === 'leading' && wasName !== now.name) out.push({ id: v.pollId, text: now.name === v.pick ? t.sinceYours(v.title) : t.sinceLeader(now.name, v.title) });
    }
    setRows(out.slice(0, LIST_FIRST));
    try {
      localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(votes.map((v) => [v.pollId, sig(v.standing)]))));
    } catch {}
    // Once per visit: the snapshot is saved right after comparing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!rows.length) return null;
  return (
    <section className="al-block block-tight" aria-label={t.sinceTitle}>
      <h2 className="al-block__title">{t.sinceTitle}<span className="al-block__aside">{rows.length}</span></h2>
      <ul className="al-listcard">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/p/${r.id}`} className="al-row">
              <span className="al-row__main"><span className="al-row__title since-row">{r.text}</span></span>
              <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
