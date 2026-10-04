'use client';
import { Bell, BellRing } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLang, useT } from '@/lib/lang';

// "Tell me the result" (docs/DESIGN.md, "Result alerts"): offered after you vote on a poll whose result comes later
// (an end time, or a "Called it" waiting for its answer). Our own line first, then the browser's question only when
// tapped (never on arrival); one alert for this poll, then nothing. iPhone needs the site on the Home Screen first.
const KEY = 'election-alerts';
export const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const readOn = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
};
const writeOn = (ids: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(-50)));
  } catch {}
};
export function keyBytes(base64: string) {
  const s = atob((base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export default function ResultAlert({ pollId }: { pollId: string }) {
  const t = useT();
  const lang = useLang();
  const [state, setState] = useState<'hidden' | 'ask' | 'ios' | 'on' | 'blocked' | 'busy'>('hidden');
  useEffect(() => {
    if (!PUBLIC_KEY) return;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setState(ios && !standalone ? 'ios' : 'hidden');
      return;
    }
    if (readOn().includes(pollId)) setState('on');
    else if (Notification.permission === 'denied') setState('blocked');
    else setState('ask');
  }, [pollId]);

  async function turnOn() {
    setState('busy');
    try {
      if ((await Notification.requestPermission()) !== 'granted') return setState('blocked');
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
      const res = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pollId, subscription: sub.toJSON(), lang }) });
      if (!res.ok) return setState('ask');
      writeOn([...readOn().filter((x) => x !== pollId), pollId]);
      setState('on');
    } catch {
      setState('ask');
    }
  }
  async function turnOff() {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js').catch(() => undefined);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pollId, endpoint: sub.endpoint }) }).catch(() => null);
    writeOn(readOn().filter((x) => x !== pollId));
    setState('ask');
  }

  if (state === 'hidden') return null;
  return (
    <div className="duel-group result-alert">
      {state === 'on' ? (
        <p className="small"><BellRing size={14} strokeWidth={1.75} aria-hidden /> {t.pushOn} <button type="button" className="link-like muted" onClick={turnOff}>{t.pushOff}</button></p>
      ) : state === 'ios' ? (
        <p className="small muted"><Bell size={14} strokeWidth={1.75} aria-hidden /> {t.pushIos}</p>
      ) : state === 'blocked' ? (
        <p className="small muted"><Bell size={14} strokeWidth={1.75} aria-hidden /> {t.pushBlocked}</p>
      ) : (
        <>
          <button type="button" className="btn btn-ghost" onClick={turnOn} disabled={state === 'busy'}><Bell size={14} strokeWidth={1.75} aria-hidden /> {t.pushAsk}</button>
          <p className="small muted">{t.pushWhy}</p>
        </>
      )}
    </div>
  );
}
