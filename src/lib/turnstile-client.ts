'use client';
// The page side of the Turnstile check (see turnstile.ts). Off when NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set.
// A token is made in the background while you look at the ballot, so pressing Vote is not slowed down.
type Turnstile = { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id: string) => void };
const KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

let loading: Promise<void> | null = null;
let widget: string | null = null;
let token: string | null = null;
const waiting: ((t: string | null) => void)[] = [];
const ts = () => (window as unknown as { turnstile?: Turnstile }).turnstile;
const settle = (t: string | null) => waiting.splice(0).forEach((w) => w(t));

function load(): Promise<void> {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('turnstile'));
    document.head.appendChild(s);
  });
  return loading;
}

/** Starts the check in the background (call when the ballot shows). */
export function prepareHumanCheck() {
  if (!KEY || widget) return;
  load()
    .then(() => {
      if (widget || !ts()) return;
      const el = document.createElement('div');
      el.className = 'human-check';
      document.body.appendChild(el);
      widget = ts()!.render(el, {
        sitekey: KEY,
        appearance: 'interaction-only',
        callback: (t: string) => {
          token = t;
          settle(t);
        },
        'expired-callback': () => {
          token = null;
          if (widget) ts()?.reset(widget);
        },
        'error-callback': () => settle(null),
      });
    })
    .catch(() => settle(null));
}

/** A one-time token for the vote (null when the check is off or could not run). */
export async function humanToken(): Promise<string | null> {
  if (!KEY) return null;
  prepareHumanCheck();
  const t = token ?? (await new Promise<string | null>((resolve) => {
    waiting.push(resolve);
    setTimeout(() => resolve(null), 8000);
  }));
  token = null;
  // Each token works once: start the next one for the next vote. Not after a timeout: that would wipe a check the
  // person is still solving.
  if (t && widget) ts()?.reset(widget);
  return t;
}
