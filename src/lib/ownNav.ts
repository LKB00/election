'use client';
import { useEffect, useSyncExternalStore } from 'react';

// "This page is your own poll" (docs/DESIGN.md, "Your poll's place"): the poll page says so (it knows who made it), and
// the top bar and the phone's bottom bar read it, so your own poll sits under You with Back to its maker page, never
// under Home. Cleared when the page goes away.
let own: string | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

export function useOwnPoll(): string | null {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => own,
    () => null,
  );
}

/** Marks the poll on this page as yours while the page is open. */
export function useMarkOwnPoll(id: string) {
  useEffect(() => {
    own = id;
    notify();
    return () => {
      if (own === id) own = null;
      notify();
    };
  }, [id]);
}
