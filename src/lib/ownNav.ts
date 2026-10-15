'use client';
import { useEffect, useSyncExternalStore } from 'react';

// "This page is yours" (docs/DESIGN.md, "Your poll's place"): your own poll, poll night or knockout battle says so (the
// server knows who made it), and the top bar and the phone's bottom bar read it, so it sits under You with Back to its
// own place, never under Home. Cleared when the page goes away.
export type OwnPage = { path: string; back: string; kind: 'poll' | 'set' };
let own: OwnPage | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

export function useOwnPage(): OwnPage | null {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => own,
    () => null,
  );
}

/** Marks this page as yours while it is open. */
export function useMarkOwnPage(path: string, back: string, kind: OwnPage['kind']) {
  useEffect(() => {
    const mark = { path, back, kind };
    own = mark;
    notify();
    return () => {
      if (own === mark) own = null;
      notify();
    };
  }, [path, back, kind]);
}

/** For a server page: renders nothing, marks the page as yours. */
export function MarkOwn({ path, back, kind }: OwnPage) {
  useMarkOwnPage(path, back, kind);
  return null;
}
