'use client';
import Link from 'next/link';
import { ArrowRight, Swords } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PollView } from '@/lib/polls';

// The duel of the day, as patricka's dark Daily banner. Updates the moment you vote in it.
export default function DuelBanner({ poll }: { poll: PollView }) {
  const [done, setDone] = useState(poll.myVote !== null);
  const [count, setCount] = useState(poll.participants);
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent).detail === poll.id && !done) {
        setDone(true);
        setCount((c) => c + 1);
      }
    };
    window.addEventListener('voted', on);
    return () => window.removeEventListener('voted', on);
  }, [poll.id, done]);
  return (
    <Link href={`/p/${poll.id}`} className={'daily-banner' + (done ? ' is-done' : '')}>
      <Swords size={22} strokeWidth={1.75} aria-hidden />
      <span className="daily-banner-text">
        <strong>Duel of the day</strong>
        <span>{done ? `You voted. ${count.toLocaleString()} votes so far. Dare a friend.` : `${poll.options.map((o) => o.label).join(' vs ')}. ${count.toLocaleString()} votes so far.`}</span>
      </span>
      <span className="btn btn-primary">{done ? 'See result' : 'Vote now'} <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></span>
    </Link>
  );
}
