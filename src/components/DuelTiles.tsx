'use client';
import Link from 'next/link';
import { Check, ChevronRight, Plus } from 'lucide-react';
import { topicIcon } from '@/lib/topicIcons';
import EmptyState from './EmptyState';
import TopicSpot from './TopicSpot';
import { useEffect, useState } from 'react';
import type { PollSummary } from '@/lib/polls';
import { useT } from '@/lib/lang';
import { emojiFor } from '@/lib/createHelp';
import { RATING_EMOJIS } from '@/lib/rating';
import type { VotedEvent } from '@/lib/useStats';
import { LIVE_COUNTS_MAX, LIVE_COUNTS_MS, LIVE_COUNTS_TIMES } from '@/lib/limits';

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

export default function DuelTiles({ polls, votedIds = [], noCreate = false, limit, topic }: { polls: PollSummary[]; votedIds?: string[]; noCreate?: boolean; limit?: number; /** Topic page: the empty state names it and Create starts in it. */ topic?: string }) {
  const t = useT();
  const [voted, setVoted] = useState<string[]>(votedIds);
  const [counts, setCounts] = useState<Record<string, number>>({});
  // Fresh totals from the server (other people's votes), and which rows just went up (their count gives a small tick).
  const [live, setLive] = useState<Record<string, number>>({});
  const [bumped, setBumped] = useState<string[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const { id, delta } = (e as CustomEvent<VotedEvent>).detail ?? {};
      if (!id) return;
      setVoted((v) => (delta < 0 ? v.filter((x) => x !== id) : v.includes(id) ? v : [...v, id]));
      setCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + delta }));
      setLive((l) => (id in l ? { ...l, [id]: l[id] + delta } : l));
    };
    window.addEventListener('voted', on);
    return () => window.removeEventListener('voted', on);
  }, []);
  // Signs of life (docs/DESIGN.md, "Motion round"): while the page is open and on screen, the open polls' counts are
  // asked for again now and then, and a count that went up ticks. A few times only, then it rests.
  const openIds = polls.filter((p) => !p.closed).slice(0, LIVE_COUNTS_MAX).map((p) => p.id).join(',');
  useEffect(() => {
    if (!openIds) return;
    let times = 0;
    let stop = false;
    const ask = async () => {
      if (document.hidden || stop) return;
      times += 1;
      const fresh = (await fetch(`/api/polls/counts?ids=${openIds}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)) as Record<string, number> | null;
      if (!fresh || stop) return;
      setLive((before) => {
        const up = Object.keys(fresh).filter((id) => fresh[id] > (before[id] ?? polls.find((p) => p.id === id)!.totalVotes + (counts[id] ?? 0)));
        setBumped(up);
        // Never step a number back because an older answer arrived after your own vote.
        return Object.fromEntries(Object.entries(fresh).map(([id, n]) => [id, Math.max(n, before[id] ?? 0)]));
      });
    };
    const timer = window.setInterval(() => (times >= LIVE_COUNTS_TIMES ? window.clearInterval(timer) : void ask()), LIVE_COUNTS_MS);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
    // The list of polls, not every count change, restarts it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIds]);

  const rank = (p: PollSummary) => (p.closed ? 2 : voted.includes(p.id) ? 1 : 0);
  const sorted = [...polls].sort((a, b) => rank(a) - rank(b));
  // A long list shows its first rows, then "Show N more" (what you can still vote on comes first anyway).
  const [all, setAll] = useState(false);
  const shown = limit && !all ? sorted.slice(0, limit) : sorted;
  const hiddenN = sorted.length - shown.length;

  // Empty list: a picture, one line and the one next step (start the first poll), instead of a lone "Start" row.
  if (!polls.length && !noCreate) {
    const name = topic ? t.categories[topic] ?? topic : '';
    return <EmptyState kind="list" picture={topic ? <TopicSpot category={topic} /> : undefined} title={topic ? t.emptyTopic(name) : t.emptyHome} line={topic ? t.emptyTopicLine : t.emptyHomeLine} action={{ href: topic ? `/create?topic=${topic}` : '/create', label: t.startDuel }} />;
  }
  return (
    <>
    <ul className="al-listcard al-stagger">
      {shown.map((p, n) => {
        const done = voted.includes(p.id);
        const total = live[p.id] ?? p.totalVotes + (counts[p.id] ?? 0);
        const ticked = bumped.includes(p.id);
        const Icon = topicIcon(p.category);
        const face = faces(p);
        return (
          <li key={p.id} style={{ '--row': n } as React.CSSProperties}>
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
                {/* Where it stands, on its own line under the title (a side column squeezed titles on phones). */}
                <span className="al-row__status">
                  {done ? (
                    <span className="al-row__done"><Check size={14} strokeWidth={2.25} aria-hidden /> {t.voted}</span>
                  ) : p.closed ? (
                    <span>{t.ended}</span>
                  ) : null}
                  {(done || p.closed) && <span aria-hidden> · </span>}
                  <span key={total} className={ticked ? 'al-row__tick' : undefined}>{!done && !p.closed && total === 0 ? t.newPoll : t.votes(total)}</span>
                </span>
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
