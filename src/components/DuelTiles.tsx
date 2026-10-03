'use client';
import Link from 'next/link';
import { Check, Cpu, Film, Landmark, Medal, Music, Plus, Swords, Trophy, Users, UtensilsCrossed } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PollSummary } from '@/lib/polls';
import { useT } from '@/lib/lang';

// One pastel tile per duel (patricka game tiles).
// Order = what you can still do first: live and not voted → voted → ended. Updates the moment you vote.
const TONES = ['game-e', 'game-f', 'game-b', 'game-d', 'game-a'];
// The tile icon says the topic at a glance (it was the same people icon on every tile, which said nothing).
const ICONS: Record<string, typeof Swords> = { politics: Landmark, cricket: Trophy, sports: Medal, movies: Film, music: Music, food: UtensilsCrossed, tech: Cpu, friends: Users };

export default function DuelTiles({ polls, votedIds = [], noCreate = false }: { polls: PollSummary[]; votedIds?: string[]; noCreate?: boolean }) {
  const t = useT();
  const [voted, setVoted] = useState<string[]>(votedIds);
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent).detail as string | undefined;
      if (!id) return;
      setVoted((v) => (v.includes(id) ? v : [...v, id]));
      setCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    };
    window.addEventListener('voted', on);
    return () => window.removeEventListener('voted', on);
  }, []);

  const rank = (p: PollSummary) => (p.closed ? 2 : voted.includes(p.id) ? 1 : 0);
  const sorted = [...polls].sort((a, b) => rank(a) - rank(b));

  return (
    <div className="games">
      {sorted.map((p, n) => {
        const done = voted.includes(p.id);
        const total = p.totalVotes + (counts[p.id] ?? 0);
        const Icon = ICONS[p.category] ?? Swords;
        return (
          <Link key={p.id} href={`/p/${p.id}`} className={`game ${TONES[n % TONES.length]}`}>
            <Icon size={22} strokeWidth={1.75} aria-hidden />
            <strong>{p.title}</strong>
            {/* Long duels (IPL's 10 teams) show the first three and how many more. */}
            <span>{p.options.slice(0, 3).join(' vs ')}{p.options.length > 3 && ` +${p.options.length - 3}`}</span>
            <span className="game-meta">
              {done ? (
                <><Check size={13} strokeWidth={2} aria-hidden /> {t.youVotedN(total)}</>
              ) : p.closed ? (
                <>{t.endedSee}</>
              ) : (
                <>{total === 0 ? t.beFirstVote : t.liveN(total)}</>
              )}
            </span>
          </Link>
        );
      })}
      {/* Creating comes after voting, so this tile is last (docs/DESIGN.md). */}
      {!noCreate && <Link href="/create" className="game game-c">
        <Plus size={22} strokeWidth={1.75} aria-hidden />
        <strong>{t.startOwn}</strong>
        <span>{t.startOwnLine}</span>
        <span className="game-meta">{t.freeNoSignup}</span>
      </Link>}
    </div>
  );
}
