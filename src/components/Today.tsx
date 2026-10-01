'use client';
import { Flame } from 'lucide-react';
import type { VoterStats } from '@/lib/polls';
import { DAILY_GOAL, useStats } from '@/lib/useStats';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Today: goal ring, day streak and the last 7 days (same card as patricka).
// hideUntilVoted: a goal ring and a 0-day streak mean nothing before your first vote (docs/DESIGN.md).
export default function TodayCard({ initial, hideUntilVoted = false }: { initial?: VoterStats; hideUntilVoted?: boolean }) {
  const { votes, today, streak, days } = useStats(initial);
  const pct = Math.min(1, today / DAILY_GOAL);
  const r = 26;
  const c = 2 * Math.PI * r;
  const played = new Set(days);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400_000);
    const k = d.toISOString().slice(0, 10);
    return { k, label: WEEK[d.getUTCDay()], played: played.has(k), today: i === 6 };
  });
  if (hideUntilVoted && votes === 0) return null;
  const card = (
    <div className="today-card">
      <div className="today-goal">
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r={r} className="ring-bg" />
          <circle cx="32" cy="32" r={r} className="ring-fg ring-goal" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
        </svg>
        <span className="today-goal-num">{Math.min(today, DAILY_GOAL)}<small>/{DAILY_GOAL}</small></span>
      </div>
      <div className="today-text">
        <p className="label">Today</p>
        <p className="today-title">{pct >= 1 ? 'Daily goal done!' : `${DAILY_GOAL - today} more ${DAILY_GOAL - today === 1 ? 'duel' : 'duels'} today`}</p>
        <p className="small muted">Vote in {DAILY_GOAL} duels a day to keep your streak.</p>
      </div>
      <div className="today-streak">
        <span className={'today-flame' + (today > 0 ? ' is-lit' : '')}><Flame size={20} strokeWidth={2} aria-hidden /> {streak}</span>
        <span className="small muted">day streak</span>
      </div>
      <ol className="week" aria-label="Last 7 days">
        {last7.map((d) => (
          <li key={d.k} className={(d.played ? 'is-played' : '') + (d.today ? ' is-today' : '')} title={d.k}>
            <span className="week-dot">{d.played ? <Flame size={12} strokeWidth={2} aria-hidden /> : null}</span>
            <span className="week-day">{d.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
  return hideUntilVoted ? <section className="block">{card}</section> : card;
}
