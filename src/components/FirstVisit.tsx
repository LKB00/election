'use client';
import { useEffect } from 'react';
import { track } from '@/lib/track';

const KEY = 'election-visited';

/** Counts this phone once for "N people have visited" on Home. It only remembers that it was counted, nothing else;
 * if the phone cannot remember (private mode, storage off), it is not counted, so nobody is counted on every visit. */
export default function FirstVisit() {
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
      localStorage.setItem(KEY, '1');
      if (localStorage.getItem(KEY)) track('visitor');
    } catch {
      /* storage blocked: not counted */
    }
  }, []);
  return null;
}
