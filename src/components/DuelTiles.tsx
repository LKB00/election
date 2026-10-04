'use client';
import Link from 'next/link';
import { Check, ChevronRight, Plus } from 'lucide-react';
import { topicIcon } from '@/lib/topicIcons';
import { useEffect, useState } from 'react';
import type { PollSummary } from '@/lib/polls';
import { useT } from '@/lib/lang';
import { emojiFor } from '@/lib/createHelp';
import { RATING_EMOJIS } from '@/lib/rating';
import type { VotedEvent } from '@/lib/useStats';

// A list of polls in Arogya Line's grouped list card: one row per poll, a tinted disc with the topic icon, the question,
// the choices as a quiet line, the vote count on the right, a chevron. (Was a grid of pastel tiles.)
// Order = what you can still do first: live and not voted → voted → ended. Updates the moment you vote.
const TONES = ['var(--p-input)', 'var(--p-feedback)', 'var(--p-control)', 'var(--p-trust)', 'var(--p-output)'];

// Show what it is (Arogya's P3): the poll's own faces, e.g. 🍵☕ for "Chai or coffee?", recognised before read.
// The creator's emoji, else the same suggestion Create makes from the name; the topic icon only when neither exists.
function faces(p: PollSummary): string {
  if (p.kind === 'rating') return RATING_EMOJIS[4];
  const picks = p.options.slice(0, 2).map((o, n) => p.emojis[n] || emojiFor(o));
  return picks.every(Boolean) ? picks.join('') : '';
}
// Every element earns its place: the choices line goes when the question already names every choice ("Dosa or idli?").
function repeatsTitle(p: PollSummary): boolean {
  if (p.kind !== 'choice' || p.calledIt) return false;
  const title = p.title.toLocaleLowerCase();
  return p.options.every((o) => title.includes(o.toLocaleLowerCase().trim()));
}

export default function DuelTiles({ polls, votedIds = [], noCreate = false, limit }: { polls: PollSummary[]; votedIds?: string[]; noCreate?: boolean; limit?: number }) {
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
  // A long list shows its first rows, then "Show N more" (what you can still vote on comes first anyway).
  const [all, setAll] = useState(false);
  const shown = limit && !all ? sorted.slice(0, limit) : sorted;
  const hiddenN = sorted.length - shown.length;

  return (
    <>
    <ul className="al-listcard">
      {shown.map((p, n) => {
        const done = voted.includes(p.id);
        const total = p.totalVotes + (counts[p.id] ?? 0);
        const Icon = topicIcon(p.category);
        const face = faces(p);
        return (
          <li key={p.id}>
            <Link href={`/p/${p.id}`} className={'al-row' + (done || p.closed ? ' is-done' : '')}>
              <span className={'al-row__disc' + (face ? ' is-faces' : '')} style={{ '--tone': TONES[n % TONES.length] } as React.CSSProperties} aria-hidden>
                {face || <Icon size={20} strokeWidth={1.75} />}
              </span>
              <span className="al-row__main">
                <span className="al-row__title">{p.title}</span>
                {/* Long polls (IPL's 10 teams) show the first three and how many more. */}
                {!repeatsTitle(p) && <span className="al-row__meta">
                  {p.kind === 'rating' ? t.tileRate : <>{p.calledIt ? `🔮 ${t.tileCalled}: ` : p.kind === 'multi' ? `${t.tileMulti}: ` : p.kind === 'rank' ? `${t.tileRank}: ` : ''}{p.options.slice(0, 3).join(p.kind === 'multi' || p.kind === 'rank' ? ', ' : ' vs ')}{p.options.length > 3 && ` +${p.options.length - 3}`}</>}
                </span>}
              </span>
              <span className="al-row__when">
                {done ? (
                  <span className="al-row__done"><Check size={14} strokeWidth={2.25} aria-hidden /> {t.voted}</span>
                ) : p.closed ? (
                  <span>{t.ended}</span>
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
    {hiddenN > 0 && (
      <button type="button" className="btn btn-ghost btn-lg al-more" onClick={() => setAll(true)}>{t.showMorePolls(hiddenN)}</button>
    )}
    </>
  );
}
