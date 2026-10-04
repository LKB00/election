'use client';
import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PollView } from '@/lib/polls';
import { useT } from '@/lib/lang';
import type { VotedEvent } from '@/lib/useStats';

// The poll of the day. Updates the moment you vote in it.
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
  // Arogya Line's "Up next" card: a soft card with a status chip, the question as the big line, what it is about, and the
  // one full-width action at the bottom. (Was patricka's dark Daily banner.)
  return (
    <div className={'al-hero' + (done ? ' is-done' : '')}>
      <span className="al-chip is-you"><CalendarDays size={14} strokeWidth={2} aria-hidden /> {t.duelOfDay}</span>
      <p className="al-hero__name">{poll.title}</p>
      <p className="al-hero__fact">{done ? t.bannerDone(count) : t.bannerOpen(poll.options.map((o) => o.label).join(' vs '), count)}</p>
      <Link href={`/p/${poll.id}`} className="al-hero__action">{done ? t.seeResult : t.voteNow} <ArrowRight size={16} strokeWidth={2} aria-hidden /></Link>
    </div>
  );
}
