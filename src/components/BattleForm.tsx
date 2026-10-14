'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Swords } from 'lucide-react';
import { apiMsg } from '@/lib/i18n';
import { useLang, useT } from '@/lib/lang';
import { BATTLE_ROUND_HOURS, BATTLE_SIZES, MAX_CHOICE, MIN_TITLE } from '@/lib/limits';
import { sameKey } from '@/lib/same';

// Making a knockout battle (docs/DESIGN.md, "Knockout battles"): a name, 4 or 8 choices (in seed order: 1 meets 2,
// 3 meets 4…), how long each round lasts, and "Show my name". One main button.
export default function BattleForm() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [size, setSize] = useState<number>(BATTLE_SIZES[1]);
  const [names, setNames] = useState<string[]>(Array(BATTLE_SIZES[1]).fill(''));
  const [hours, setHours] = useState<number>(24);
  const [showMaker, setShowMaker] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hourWords: Record<number, string> = { 1: t.battleH1, 24: t.battleH24, 72: t.battleH72 };
  const pickSize = (n: number) => {
    setSize(n);
    setNames((x) => [...x, ...Array(Math.max(0, n - x.length)).fill('')].slice(0, n));
  };
  function problem() {
    if (title.trim().length < MIN_TITLE) return t.errTitle;
    const filled = names.map((n) => n.trim());
    if (filled.some((n) => !n)) return t.battleErrNames(size);
    if (new Set(filled.map(sameKey)).size !== filled.length) return t.errSame;
    return '';
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = problem();
    if (p) return setError(p);
    setBusy(true);
    setError('');
    const res = await fetch('/api/battles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), entrants: names.map((n) => ({ label: n.trim(), emoji: '' })), roundHours: hours, showMaker }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.id) return router.replace(`/b/${data.id}?new=1`);
    setBusy(false);
    setError(data?.error ? apiMsg(lang, data.error) : t.errGeneric);
  }
  return (
    <form className="pack-form battle-form" onSubmit={submit}>
      <label className="field">
        <span className="label">{t.battleName}</span>
        <input className="input" value={title} maxLength={60} placeholder={t.battleNamePh} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className="field">
        <span className="label">{t.battleSize}</span>
        <div className="builder-kind" role="radiogroup" aria-label={t.battleSize}>
          {BATTLE_SIZES.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={size === n} className={'chip' + (size === n ? ' chip-on' : '')} onClick={() => pickSize(n)}>{n}</button>
          ))}
        </div>
      </div>
      <ol className="battle-entrants">
        {names.map((n, i) => (
          <li key={i}>
            <label className="search">
              <span className="battle-seed" aria-hidden>{i + 1}</span>
              <span className="sr-only">{t.battleEntrant(i + 1)}</span>
              <input value={n} maxLength={MAX_CHOICE} placeholder={t.battleEntrant(i + 1)} onChange={(e) => setNames((x) => x.map((y, j) => (j === i ? e.target.value : y)))} />
            </label>
            {i % 2 === 0 && <span className="battle-vs" aria-hidden>vs</span>}
          </li>
        ))}
      </ol>
      <div className="field">
        <span className="label">{t.battleRoundLen}</span>
        <div className="builder-kind" role="radiogroup" aria-label={t.battleRoundLen}>
          {BATTLE_ROUND_HOURS.map((h) => (
            <button key={h} type="button" role="radio" aria-checked={hours === h} className={'chip' + (hours === h ? ' chip-on' : '')} onClick={() => setHours(h)}>{hourWords[h]}</button>
          ))}
        </div>
      </div>
      <label className="small picker-consent">
        <input type="checkbox" checked={showMaker} onChange={(e) => setShowMaker(e.target.checked)} />
        <span>{t.setShowMe}</span>
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-lg" disabled={busy}><Swords size={18} strokeWidth={2} aria-hidden /> {busy ? t.battleMaking : t.battleMake}</button>
    </form>
  );
}
