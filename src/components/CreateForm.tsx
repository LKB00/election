'use client';
import { useRouter } from 'next/navigation';
import { ChevronDown, Clock, EyeOff, Plus, Repeat, X } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { useLang, useT } from '@/lib/lang';
import { apiMsg } from '@/lib/i18n';
import { faceLabels } from '@/lib/labels';

export default function CreateForm() {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [choices, setChoices] = useState(['', '']);
  // One optional emoji per choice, kept in step with the choices.
  const [emojis, setEmojis] = useState(['', '']);
  const [endsAt, setEndsAt] = useState('');
  const [hideUntilVoted, setHide] = useState(true); // on by default: guess first, then see (the guess game)
  const [allowChange, setChange] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Errors show under the field they belong to, and focus moves there.
  const [fieldError, setFieldError] = useState<{ title?: string; choices?: string; end?: string }>({});
  // P3 settings stay folded: the promise is "30 seconds" (docs/DESIGN.md, Flow 3).
  const [more, setMore] = useState(false);

  const setChoice = (i: number, v: string) => setChoices((c) => c.map((x, j) => (j === i ? v : x)));
  const setEmoji = (i: number, v: string) => setEmojis((e) => e.map((x, j) => (j === i ? v.trim() : x)));
  const removeChoice = (i: number) => {
    setChoices((x) => x.filter((_, j) => j !== i));
    setEmojis((x) => x.filter((_, j) => j !== i));
  };
  // Quick start: fill the shape of a common duel, then the person only types the question (and names).
  // A number chip never removes a choice you already typed (5 filled + "3 choices" keeps all 5).
  function starter(kind: 'yesno' | 3 | 4) {
    const lastFilled = choices.reduce((m, c, i) => (c.trim() ? i : m), -1);
    const next = kind === 'yesno' ? [t.yes, t.no] : Array.from({ length: Math.max(kind, lastFilled + 1) }, (_, i) => choices[i] ?? '');
    setChoices(next);
    setEmojis(kind === 'yesno' ? ['👍', '👎'] : next.map((_, i) => emojis[i] ?? ''));
    setFieldError({});
    document.getElementById(kind === 'yesno' ? 'title' : 'choice-0')?.focus();
  }
  // Phone keyboards: Enter moves to the next box (it used to send a half-filled form); on the last choice it creates the duel.
  function onEnter(e: React.KeyboardEvent<HTMLInputElement>, next: string | null) {
    if (e.key !== 'Enter' || !next) return;
    e.preventDefault();
    document.getElementById(next)?.focus();
  }
  const typedChoices = choices.some((c) => c.trim());
  // The end time as the phone shows it (local time, no seconds), for the picker's earliest allowed value.
  const localNow = () => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
    return d.toISOString().slice(0, 16);
  };
  const filledChoices = choices.map((c, i) => ({ label: c.trim(), emoji: emojis[i] })).filter((c) => c.label);

  function check() {
    const filled = choices.map((c) => c.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const errs: { title?: string; choices?: string; end?: string } = {};
    if (title.trim().length < 3) errs.title = t.errTitle;
    if (filled.length < 2) errs.choices = t.errChoices;
    else if (new Set(filled.map((c) => c.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') || c)).size !== filled.length) errs.choices = t.errSame;
    if (endsAt && !(new Date(endsAt).getTime() > Date.now())) errs.end = t.errEnd;
    setFieldError(errs);
    if (errs.title) document.getElementById('title')?.focus();
    else if (errs.choices) document.querySelector<HTMLInputElement>('input[data-choice]')?.focus();
    else if (errs.end) {
      // The end time sits under "More options": open it so the message is seen.
      setMore(true);
      setTimeout(() => document.getElementById('end')?.focus(), 0);
    }
    return !errs.title && !errs.choices && !errs.end;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !check()) return;
    setBusy(true);
    setError('');
    const kept = choices.map((c, i) => ({ c: c.trim(), e: emojis[i] ?? '' })).filter((x) => x.c);
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        category,
        options: kept.map((x) => x.c),
        emojis: kept.map((x) => x.e),
        hideUntilVoted,
        allowChange,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.id) return router.push(`/p/${data.id}?new=1`);
    setError(data?.error ? apiMsg(lang, data.error) : t.errGeneric);
    setBusy(false);
  }

  // Built only from patricka parts: .search fields, .chip choices, .me-row + .switch settings.
  return (
    <form className="me-stack" onSubmit={submit}>
      <div className="duel-group">
        <label className="label" htmlFor="title">{t.yourQuestion}</label>
        <span className="search">
          <input id="title" enterKeyHint="next" autoCapitalize="sentences" autoComplete="off" onKeyDown={(e) => onEnter(e, 'choice-0')} value={title} maxLength={120} placeholder={t.questionPh} aria-invalid={!!fieldError.title} onChange={(e) => { setTitle(e.target.value); setFieldError((f) => ({ ...f, title: undefined })); }} />
        </span>
        {fieldError.title && <p className="field-error" role="alert">{fieldError.title}</p>}
      </div>

      {/* P3: quick start chips (the shape of a common duel). */}
      <div className="duel-group">
        <span className="label">{t.quickStart}</span>
        <div className="row wrap">
          {/* Yes / No would replace what you typed, so it only shows while the choices are empty. */}
          {!typedChoices && <button type="button" className="chip" onClick={() => starter('yesno')}>{t.starterYesNo}</button>}
          <button type="button" className="chip" onClick={() => starter(3)}>{t.starterN(3)}</button>
          <button type="button" className="chip" onClick={() => starter(4)}>{t.starterN(4)}</button>
        </div>
      </div>

      <div className="duel-group">
        <span className="label">{t.choicesLabel}</span>
        {choices.map((c, i) => (
          <div className="row" key={i}>
            {/* Optional emoji, shown in the choice's circle (phones open the emoji keyboard). */}
            <span className="search emoji-in">
              <input value={emojis[i] ?? ''} maxLength={16} placeholder="🙂" aria-label={t.emojiN(i + 1)} enterKeyHint="next" onKeyDown={(e) => onEnter(e, `choice-${i}`)} onChange={(e) => setEmoji(i, e.target.value)} />
            </span>
            <span className="search">
              <input id={`choice-${i}`} enterKeyHint={i < choices.length - 1 ? 'next' : 'go'} autoCapitalize="words" autoComplete="off" onKeyDown={(e) => onEnter(e, i < choices.length - 1 ? `choice-${i + 1}` : null)} data-choice value={c} maxLength={60} aria-label={t.choiceN(i + 1)} placeholder={t.choiceN(i + 1)} aria-invalid={!!fieldError.choices} onChange={(e) => { setChoice(i, e.target.value); setFieldError((f) => ({ ...f, choices: undefined })); }} />
            </span>
            {choices.length > 2 && (
              <button type="button" className="icon-btn" aria-label={t.removeChoice(i + 1)} onClick={() => removeChoice(i)}>
                <X size={16} strokeWidth={1.75} aria-hidden />
              </button>
            )}
          </div>
        ))}
        {fieldError.choices && <p className="field-error" role="alert">{fieldError.choices}</p>}
        {choices.length < 10 && (
          <button type="button" className="chip duel-add" onClick={() => { setChoices((x) => [...x, '']); setEmojis((x) => [...x, '']); }}>
            <Plus size={14} strokeWidth={1.75} aria-hidden /> {t.addChoice}
          </button>
        )}
      </div>

      <button type="button" className="chip duel-add" aria-expanded={more} onClick={() => setMore((m) => !m)}>
        <ChevronDown size={14} strokeWidth={1.75} aria-hidden style={{ transform: more ? 'rotate(180deg)' : undefined }} /> {t.moreOptions}
      </button>

      {more && (
      <>
      <div className="duel-group">
        <label className="label" htmlFor="desc">{t.details}</label>
        <span className="search">
          <input id="desc" enterKeyHint="done" onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()} value={description} maxLength={300} placeholder={t.detailsPh} onChange={(e) => setDescription(e.target.value)} />
        </span>
      </div>

      <div className="duel-group">
        <span className="label">{t.category}</span>
        <div className="row wrap" role="radiogroup" aria-label={t.category}>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={category === c} className={'chip' + (category === c ? ' chip-on' : '')} onClick={() => setCategory(c)}>
              {t.categories[c] ?? c}
            </button>
          ))}
        </div>
      </div>

      <div className="duel-group">
        <label className="label" htmlFor="end">{t.ends}</label>
        <span className="search">
          <Clock size={14} strokeWidth={1.75} aria-hidden />
          <input id="end" type="datetime-local" min={localNow()} value={endsAt} aria-invalid={!!fieldError.end} onChange={(e) => { setEndsAt(e.target.value); setFieldError((f) => ({ ...f, end: undefined })); }} />
        </span>
        {fieldError.end && <p className="field-error" role="alert">{fieldError.end}</p>}
      </div>

      <div className="me-stack">
        <button type="button" className="me-row" onClick={() => setHide((v) => !v)} aria-pressed={hideUntilVoted}>
          <EyeOff size={20} strokeWidth={1.75} aria-hidden />
          <span><strong>{t.hideResults}</strong><span className="small muted">{t.hideResultsNote}</span></span>
          <span className={'switch' + (hideUntilVoted ? ' is-on' : '')} aria-hidden />
        </button>
        <button type="button" className="me-row" onClick={() => setChange((v) => !v)} aria-pressed={allowChange}>
          <Repeat size={20} strokeWidth={1.75} aria-hidden />
          <span><strong>{t.allowChange}</strong><span className="small muted">{t.allowChangeNote}</span></span>
          <span className={'switch' + (allowChange ? ' is-on' : '')} aria-hidden />
        </button>
      </div>
      </>
      )}

      {/* P3: what voters will see, as you type (rows like the EVM ballot unit). */}
      {(title.trim() || filledChoices.length > 0) && (
        <section className="create-preview" aria-label={t.preview}>
          <p className="label">{t.preview}</p>
          {title.trim() && <p className="display duel-q">{title.trim()}</p>}
          {filledChoices.length > 0 && (
            <div className="tot-options duel-options is-ballot" aria-hidden>
              {filledChoices.map((c, n) => (
                <span key={n} className="tot-option duel-option" style={{ '--pc': `var(--p-${['input', 'feedback', 'control', 'agents', 'output', 'trust'][n % 6]})` } as React.CSSProperties}>
                  <span className="tot-letter">{n + 1}</span>
                  <span className="duel-body">
                    <span className={'duel-face' + (c.emoji ? ' has-emoji' : '')}><span>{c.emoji || faceLabels(filledChoices.map((x) => x.label))[n]}</span></span>
                    <span className="duel-text"><span className="duel-name">{c.label}</span></span>
                  </span>
                  <span className="evm-row"><span className="evm-led" /><span className="evm-btn">{t.vote}</span></span>
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {error && <p className="duel-error" role="alert">{error}</p>}
      <div className="row">
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? t.creating : t.createDuel}</button>
      </div>
    </form>
  );
}
