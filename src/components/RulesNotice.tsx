'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/lang';
import { INDIA_TZ } from '@/lib/time';

// The IT Rules ask sites to remind people of their rules every 3 months. One quiet line (P3) on Home, once per quarter
// (India time), gone after "OK". Shows nothing until the phone has said whether it was seen, so it never flashes.
const KEY = 'election-rules-seen';
function quarter() {
  // India time, from the one place it is kept (lib/time.ts).
  const [y, m] = new Date().toLocaleDateString('en-CA', { timeZone: INDIA_TZ }).split('-').map(Number);
  return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
}

export default function RulesNotice() {
  const t = useT();
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(localStorage.getItem(KEY) !== quarter());
    } catch {
      setShow(false);
    }
  }, []);
  if (!show) return null;
  const ok = () => {
    try {
      localStorage.setItem(KEY, quarter());
    } catch {}
    setShow(false);
  };
  return (
    <aside className="rules-note small" aria-label={t.termsTitle}>
      <span>{t.rulesNote}</span>
      <Link href="/terms" className="text-link" onClick={ok}>{t.rulesRead}</Link>
      <button type="button" className="link-like muted" onClick={ok}>{t.rulesOk}</button>
    </aside>
  );
}
