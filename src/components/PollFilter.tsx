import Link from 'next/link';
import type { Dict } from '@/lib/i18n';

export type Show = 'to' | 'voted' | 'ended';
export const parseShow = (v: string | string[] | undefined): Show => (v === 'voted' || v === 'ended' ? v : 'to');

// Polls and topic pages with many polls (docs/DESIGN.md, "Polls grouped by what you can still do"): one row of tabs,
// "To vote" first and picked by default, each with its count. Plain links, so they work before scripts load and each
// view has its own address.
export default function PollFilter({ base, show, counts, t }: { base: string; show: Show; counts: Record<Show, number>; t: Dict }) {
  const tabs: [Show, string][] = [['to', t.filterTo], ['voted', t.pollsVoted], ['ended', t.pollsEnded]];
  return (
    <nav className="poll-filter row" aria-label={t.filterLabel}>
      {tabs.map(([k, label]) => (
        <Link key={k} href={k === 'to' ? base : `${base}?show=${k}`} className={'chip' + (show === k ? ' chip-on' : '')} aria-current={show === k ? 'page' : undefined} scroll={false}>
          {label} <span className="poll-filter__n">{counts[k]}</span>
        </Link>
      ))}
    </nav>
  );
}
