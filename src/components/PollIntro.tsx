'use client';
import { useEffect, useState } from 'react';

// The lines above a shared poll ("Someone wants your pick", "Asked by …", the maker's bar) belong to that poll only:
// once Next moves the game to another poll, they step aside (DuelGame announces the poll on screen).
export default function PollIntro({ pollId, children }: { pollId: string; children: React.ReactNode }) {
  const [here, setHere] = useState(true);
  useEffect(() => {
    const on = (e: Event) => setHere((e as CustomEvent<string>).detail === pollId);
    window.addEventListener('election:poll', on);
    return () => window.removeEventListener('election:poll', on);
  }, [pollId]);
  return here ? <>{children}</> : null;
}
