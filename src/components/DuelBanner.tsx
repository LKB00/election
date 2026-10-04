'use client';
import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PollView } from '@/lib/polls';
import { useT } from '@/lib/lang';
import type { VotedEvent } from '@/lib/useStats';
import { emojiFor } from '@/lib/createHelp';
import { RATING_EMOJIS } from '@/lib/rating';

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
  // The choices line only when it adds something: "Chai or coffee?" already names both.
  const names = poll.options.map((o) => o.label);
  const picks = poll.kind === 'rating' ? [RATING_EMOJIS[4]] : poll.options.slice(0, 3).map((o) => (o.imageUrl ? '' : o.emoji || emojiFor(o.label)));
  const faces = picks.every(Boolean) ? picks.join(' ') : '';
  const said = poll.kind === 'choice' && names.every((n) => poll.title.toLocaleLowerCase().includes(n.toLocaleLowerCase().trim()));
  // Arogya Line's "Up next" card: a soft card with a status chip, the question as the big line, what it is about, and the
  // one full-width action at the bottom. (Was patricka's dark Daily banner.)
  return (
    <div className={'al-hero' + (done ? ' is-done' : '')}>
      <span className="al-chip is-you"><CalendarDays size={14} strokeWidth={2} aria-hidden /> {t.duelOfDay}</span>
      {/* What it is, seen before read (P3): the choices' own pictures, big ("🍵 ☕"). */}
      {faces && <p className="al-hero__faces" aria-hidden>{faces}</p>}
      <p className="al-hero__name">{poll.title}</p>
      <p className="al-hero__fact">{done ? t.bannerDone(count) : t.bannerOpen(said || poll.kind === 'rating' ? '' : names.slice(0, 3).join(poll.kind === 'choice' ? ' vs ' : ', ') + (names.length > 3 ? ` +${names.length - 3}` : ''), count)}</p>
      <Link href={`/p/${poll.id}`} className="al-hero__action">{done ? t.seeResult : t.voteNow} <ArrowRight size={16} strokeWidth={2} aria-hidden /></Link>
    </div>
  );
}
