'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';

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

/**
 * Which section a poll was opened from (owner, Oct 2026: "whatever vote I have done should open in Your votes, not
 * Home"): links on Your votes add ?from=votes, links on Polls and topic pages ?from=polls. The top bar and the bottom
 * bar keep that tab lit, and Back goes there. Read once from the address, then kept for this tab (a refresh keeps it; a copied address stays clean).
 */
export type FromSection = 'votes' | 'polls';
// Only a refresh of the page that was opened from a section keeps it; any other way in (Home, a link) does not.
let loadedPath: string | null = null;
const wasReload = () => (performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'reload';
// Worked out once per page (the top bar and the bottom bar both ask; the first one takes ?from out of the address).
let last: { path: string; from: FromSection | null } | null = null;
function resolveFrom(path: string): FromSection | null {
  if (last?.path === path) return last.from;
  let from: FromSection | null = null;
  if (path.startsWith('/p/')) {
    // Kept for this tab (so a refresh keeps it) and taken out of the address (so a copied address is a clean link).
    const url = new URL(window.location.href);
    const key = `from:${path}`;
    let f = url.searchParams.get('from');
    loadedPath ??= path;
    try {
      if (f) {
        sessionStorage.setItem(key, f);
        url.searchParams.delete('from');
        window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
      } else if (loadedPath === path && wasReload()) f = sessionStorage.getItem(key);
      else sessionStorage.removeItem(key);
    } catch {
      /* storage blocked: the address alone decides */
    }
    from = f === 'votes' || f === 'polls' ? f : null;
  }
  last = { path, from };
  return from;
}

export function useFromSection(path: string): FromSection | null {
  const [from, setFrom] = useState<FromSection | null>(null);
  useEffect(() => setFrom(resolveFrom(path)), [path]);
  return from;
}
