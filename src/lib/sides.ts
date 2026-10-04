import type { PollOption, PollView } from './polls';

// Which side of the split you landed on, for one poll at a time (never added up across polls: that would be a score).
// Social comparison is the reward people come for, and most people expect to be in the majority (false consensus),
// so a "rare take" is the most surprising line, and the most shared. See reports/Poll engagement psychology.md.
export type Side =
  | { kind: 'first' }
  | { kind: 'neck' }
  | { kind: 'crowd'; pct: number }
  | { kind: 'minority'; pct: number }
  | { kind: 'rare'; oneIn: number };

/** A pick is "rare" when at most this share of voters made it. */
export const RARE_PCT = 20;

export function sideOf(poll: Pick<PollView, 'totalVotes' | 'options' | 'kind'>, mine: Pick<PollOption, 'percent'>): Side {
  if (poll.totalVotes <= 1) return { kind: 'first' };
  const top = Math.max(...poll.options.map((o) => o.percent));
  const p = mine.percent;
  const leading = Math.abs(top - p) < 0.01;
  if (leading && poll.options.filter((o) => Math.abs(o.percent - top) < 3).length > 1) return { kind: 'neck' };
  const pct = Math.round(p);
  if (leading) return { kind: 'crowd', pct };
  // "1 in 8" reads faster than "12%" and feels like what it is: a small club.
  if (pct > 0 && pct <= RARE_PCT && poll.kind !== 'rank') return { kind: 'rare', oneIn: Math.max(2, Math.round(100 / pct)) };
  return { kind: 'minority', pct };
}

/** One emoji per poll for the spoiler-free text share: which side, never which choice. */
export function sideEmoji(side: Side | null): string {
  if (!side) return '⬜';
  return side.kind === 'crowd' || side.kind === 'first' ? '🟩' : side.kind === 'neck' ? '🟨' : '🟪';
}
