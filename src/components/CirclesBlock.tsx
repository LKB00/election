'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { apiMsg } from '@/lib/i18n';
import { useLang, useT } from '@/lib/lang';
import { CIRCLE_NAME_MAX } from '@/lib/limits';
import { CIRCLE_EMOJIS } from '@/lib/avatars';
import type { CircleSummary } from '@/lib/circles';

// "Your circles" on You (docs/DESIGN.md, "Circles"): the small groups you are in (rows), and one quiet "Start a circle"
// that opens a name box and a few faces in place.
export default function CirclesBlock({ circles }: { circles: CircleSummary[] }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string>(CIRCLE_EMOJIS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function make(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError(t.circleErrName);
    setBusy(true);
    setError('');
    const res = await fetch('/api/circles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), emoji }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.id) return router.push(`/c/${data.id}?new=1`);
    setBusy(false);
    setError(data?.error ? apiMsg(lang, data.error) : t.errGeneric);
  }

  return (
    <section className="al-block you-circles" aria-label={t.circlesTitle}>
      <h2 className="al-block__title">{t.circlesTitle}{circles.length > 0 && <span className="al-block__aside">{circles.length}</span>}</h2>
      {circles.length > 0 ? (
        <ul className="al-listcard">
          {circles.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.id}`} className="al-row">
                <span className="al-row__disc is-faces" style={{ '--tone': 'var(--p-input)' } as React.CSSProperties} aria-hidden>{c.emoji}</span>
                <span className="al-row__main">
                  <span className="al-row__title">{c.name}</span>
                  <span className="al-row__meta">{t.circleMeta(c.members, c.polls)}</span>
                </span>
                <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        !open && <p className="small muted">{t.circlesEmpty}</p>
      )}
      {open ? (
        <form className="circle-form" onSubmit={make}>
          <label className="field">
            <span className="label">{t.circleName}</span>
            <input className="input" value={name} maxLength={CIRCLE_NAME_MAX} placeholder={t.circleNamePh} autoFocus onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="row wrap" role="radiogroup" aria-label={t.circleFace}>
            {CIRCLE_EMOJIS.map((x) => (
              <button key={x} type="button" role="radio" aria-checked={emoji === x} className={'chip' + (emoji === x ? ' chip-on' : '')} onClick={() => setEmoji(x)}>{x}</button>
            ))}
          </div>
          <p className="small muted">{t.circleNote}</p>
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="row wrap">
            <button className="btn btn-primary" disabled={busy}>{t.circleMake}</button>
            <button type="button" className="link-like small muted" onClick={() => (setOpen(false), setError(''))}>{t.cancel}</button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-ghost circle-start" onClick={() => setOpen(true)}>
          <Plus size={16} strokeWidth={2} aria-hidden /> {t.circleStart}
        </button>
      )}
    </section>
  );
}
