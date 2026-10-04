'use client';
import Link from 'next/link';
import { Check, ChevronRight, Cpu, Film, Landmark, Medal, Music, MessageCircleQuestion, Plus, Trophy, Users, UtensilsCrossed } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PollSummary } from '@/lib/polls';
import { useT } from '@/lib/lang';
import type { VotedEvent } from '@/lib/useStats';

// A list of polls in Arogya Line's grouped list card: one row per poll, a tinted disc with the topic icon, the question,
// the choices as a quiet line, the vote count on the right, a chevron. (Was a grid of pastel tiles.)
// Order = what you can still do first: live and not voted → voted → ended. Updates the moment you vote.
const TONES = ['var(--p-input)', 'var(--p-feedback)', 'var(--p-control)', 'var(--p-trust)', 'var(--p-output)'];
// The disc icon says the topic at a glance.
const ICONS: Record<string, typeof Trophy> = { politics: Landmark, cricket: Trophy, sports: Medal, movies: Film, music: Music, food: UtensilsCrossed, tech: Cpu, friends: Users };

export default function DuelTiles({ polls, votedIds = [], noCreate = false }: { polls: PollSummary[]; votedIds?: string[]; noCreate?: boolean }) {
  const t = useT();
  const [voted, setVoted] = useState<string[]>(votedIds);
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const on = (e: Event) => {
      const { id, delta } = (e as CustomEvent<VotedEvent>).detail ?? {};
      if (!id) return;
      setVoted((v) => (delta < 0 ? v.filter((x) => x !== id) : v.includes(id) ? v : [...v, id]));
      setCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + delta }));
    };
    window.addEventListener('voted', on);
    return () => window.removeEventListener('voted', on);
  }, []);

  const rank = (p: PollSummary) => (p.closed ? 2 : voted.includes(p.id) ? 1 : 0);
  const sorted = [...polls].sort((a, b) => rank(a) - rank(b));

  return (
    <ul className="al-listcard">
      {sorted.map((p, n) => {
        const done = voted.includes(p.id);
        const total = p.totalVotes + (counts[p.id] ?? 0);
        const Icon = ICONS[p.category] ?? MessageCircleQuestion;
        return (
          <li key={p.id}>
            <Link href={`/p/${p.id}`} className={'al-row' + (done || p.closed ? ' is-done' : '')}>
              <span className="al-row__disc" style={{ '--tone': TONES[n % TONES.length] } as React.CSSProperties}>
                <Icon size={20} strokeWidth={1.75} aria-hidden />
              </span>
              <span className="al-row__main">
                <span className="al-row__title">{p.title}</span>
                {/* Long polls (IPL's 10 teams) show the first three and how many more. */}
                <span className="al-row__meta">
                  {p.kind === 'rating' ? t.tileRate : <>{p.kind === 'multi' ? `${t.tileMulti}: ` : p.kind === 'rank' ? `${t.tileRank}: ` : ''}{p.options.slice(0, 3).join(p.kind === 'multi' || p.kind === 'rank' ? ', ' : ' vs ')}{p.options.length > 3 && ` +${p.options.length - 3}`}</>}
                </span>
              </span>
              <span className="al-row__when">
                {done ? (
                  <span className="al-row__done"><Check size={14} strokeWidth={2.25} aria-hidden /> {t.voted}</span>
                ) : p.closed ? (
                  <span>{t.pollingClosed}</span>
                ) : (
                  <span>{total === 0 ? t.newPoll : t.votes(total)}</span>
                )}
                {(done || p.closed) && <span className="al-row__time">{t.votes(total)}</span>}
              </span>
              <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
            </Link>
          </li>
        );
      })}
      {/* Creating comes after voting, so this row is last (docs/DESIGN.md). */}
      {!noCreate && (
        <li>
          <Link href="/create" className="al-row">
            <span className="al-row__disc" style={{ '--tone': 'var(--lime-badge)' } as React.CSSProperties}><Plus size={20} strokeWidth={1.75} aria-hidden /></span>
            <span className="al-row__main">
              <span className="al-row__title">{t.startOwn}</span>
              <span className="al-row__meta">{t.startOwnLine}</span>
            </span>
            <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
          </Link>
        </li>
      )}
    </ul>
  );
}
