'use client';
import { useEffect, useState } from 'react';
import type { PollView } from '@/lib/polls';
import TvScreen from './TvScreen';

// The pack's big screen: TvScreen for one question, with the presenter's ← → between them (docs/DESIGN.md, "Poll night").
export default function PackTv({ polls, qr, link, host }: { polls: PollView[]; qr: string; link: string; host: string }) {
  const [n, setN] = useState(0);
  const go = (d: number) => setN((x) => Math.min(polls.length - 1, Math.max(0, x + d)));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') (e.preventDefault(), go(1));
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') (e.preventDefault(), go(-1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  // A new key per question: TvScreen starts fresh (its own live count) for each one.
  return <TvScreen key={polls[n].id} initial={polls[n]} qr={qr} link={link} code={null} host={host} step={{ n, of: polls.length, go }} />;
}
