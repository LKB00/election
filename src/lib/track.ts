'use client';
import type { StepEvent } from './events';

/** Tells the owner's step counter that a step happened (src/lib/events.ts). Fire and forget; never blocks the page. */
export function track(e: StepEvent) {
  try {
    const body = JSON.stringify({ e });
    if (navigator.sendBeacon?.('/api/e', new Blob([body], { type: 'application/json' }))) return;
    void fetch('/api/e', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
  } catch {
    /* counting is best effort */
  }
}
