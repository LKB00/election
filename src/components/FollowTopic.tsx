'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus } from 'lucide-react';
import { FOLLOW_COOKIE, FOLLOW_MAX, readFollowed } from '@/lib/follow';
import { useT } from '@/lib/lang';

const read = () => readFollowed(document.cookie.split('; ').find((c) => c.startsWith(`${FOLLOW_COOKIE}=`))?.slice(FOLLOW_COOKIE.length + 1));

/** "Follow" on a topic page: this topic's polls come first on Home, on this phone. A second tap stops following. */
export default function FollowTopic({ topic }: { topic: string }) {
  const t = useT();
  const router = useRouter();
  const [on, setOn] = useState(false);
  useEffect(() => setOn(read().includes(topic)), [topic]);
  const flip = () => {
    const now = read().filter((c) => c !== topic);
    const next = on ? now : [topic, ...now].slice(0, FOLLOW_MAX);
    document.cookie = `${FOLLOW_COOKIE}=${next.map(encodeURIComponent).join(',')}; path=/; max-age=${365 * 86400}; samesite=lax`;
    setOn(!on);
    router.refresh();
  };
  return (
    <button type="button" className={on ? 'link-like muted' : 'text-link'} aria-pressed={on} onClick={flip}>
      {on ? <Check size={14} strokeWidth={2.25} aria-hidden /> : <Plus size={14} strokeWidth={2.25} aria-hidden />} {on ? t.followingTopic : t.followTopic}
    </button>
  );
}
