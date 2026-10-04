'use client';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/lang';

// "Add to home screen", asked once (P3, on the end of today's set): tomorrow's set is then one tap away. Only where it
// really works: Android Chrome gives us its install prompt; iPhone Safari gets the two steps in words. Inside WhatsApp's
// own browser, on computers, or once installed: nothing. Either answer is remembered for good (no nagging).
type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = 'election-install-asked';

// The browser offers the prompt once, early; keep it until the end card asks.
let saved: BIP | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    saved = e as BIP;
  });
}

export default function InstallInvite() {
  const t = useT();
  const [mode, setMode] = useState<'android' | 'ios' | null>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      return;
    }
    if (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone) return;
    const ua = navigator.userAgent;
    // iPhone Safari only (in-app browsers like WhatsApp or Instagram cannot add to the home screen).
    const iosSafari = /iPhone|iPad/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|WhatsApp/.test(ua);
    if (saved) setMode('android');
    else if (iosSafari) setMode('ios');
  }, []);
  if (!mode) return null;
  const done = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
    setMode(null);
  };
  const add = async () => {
    if (saved) {
      await saved.prompt().catch(() => {});
      saved = null;
    }
    done();
  };
  return (
    <aside className="rules-note small install-invite" aria-label={t.installTitle}>
      <span><strong>{t.installTitle}</strong> {mode === 'ios' ? t.installIos : t.installWhy}</span>
      {mode === 'android' && <button type="button" className="btn btn-ghost" onClick={add}>{t.installAdd}</button>}
      <button type="button" className="link-like muted" onClick={done}>{mode === 'ios' ? t.rulesOk : t.installNotNow}</button>
    </aside>
  );
}
