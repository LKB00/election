'use client';
import { useCallback, useEffect, useState } from 'react';
import type { VoterStats } from './polls';

export const DAILY_GOAL = 3;
const EMPTY: VoterStats = { votes: 0, today: 0, streak: 0, best: 0, days: [] };

/** Your votes and streak. Refreshes after every vote (the 'voted' event). */
export function useStats(initial?: VoterStats) {
  const [stats, setStats] = useState<VoterStats>(initial ?? EMPTY);
  const load = useCallback(async () => {
    const res = await fetch('/api/me', { cache: 'no-store' }).catch(() => null);
    if (res?.ok) setStats(await res.json());
  }, []);
  useEffect(() => {
    if (!initial) load();
    window.addEventListener('voted', load);
    return () => window.removeEventListener('voted', load);
  }, [initial, load]);
  return stats;
}

export const announceVote = (pollId?: string) => window.dispatchEvent(new CustomEvent('voted', { detail: pollId }));
