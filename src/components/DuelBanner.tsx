'use client';
import Link from 'next/link';
import { ArrowRight, Landmark } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PollView } from '@/lib/polls';
import { useT } from '@/lib/lang';
import type { VotedEvent } from '@/lib/useStats';

// The duel of the day, as patricka's dark Daily banner. Updates the moment you vote in it.
export default function DuelBanner({ poll }: { poll: PollView }) {
  const t = useT();
  const [done, setDone] = useState(poll.myVote !== null);
  const [count, setCount] = useState(poll.participants);
  useEffect(() => {
    const on = (e: Event) => {
      const { id, delta } = (e as CustomEvent<VotedEvent>).detail ?? {};
      if (id !== poll.id || (delta > 0) === done) return;
      setDone(delta > 0);
      setCount((c) => c + delta);
    };
    window.addEventListener('voted', on);
    return () => window.removeEventListener('voted', on);
  }, [poll.id, done]);
  return (
    <Link href={`/p/${poll.id}`} className={'daily-banner' + (done ? ' is-done' : '')}>
      <Landmark size={22} strokeWidth={1.75} aria-hidden />
      <span className="daily-banner-text">
        <strong>{t.duelOfDay}</strong>
        <span>{done ? t.bannerDone(count) : t.bannerOpen(poll.options.map((o) => o.label).join(' vs '), count)}</span>
      </span>
      <span className="btn btn-primary">{done ? t.seeResult : t.voteNow} <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></span>
    </Link>
  );
}
