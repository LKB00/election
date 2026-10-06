'use client';
import { useEffect } from 'react';
import type { StepEvent } from '@/lib/events';
import { track } from '@/lib/track';

/** Counts a page view for the owner's step counter once per page (and "opened from a share link" on a poll). */
export default function Step({ e, sharedCheck = false }: { e: StepEvent; sharedCheck?: boolean }) {
  useEffect(() => {
    track(e);
    if (!sharedCheck) return;
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('f') || q.get('src')) track('shared_open');
    } catch {}
  }, [e, sharedCheck]);
  return null;
}
