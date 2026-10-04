'use client';
import { useRouter } from 'next/navigation';
import { ChevronDown, Clock, EyeOff, Lightbulb, Repeat, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { useLang, useT } from '@/lib/lang';
import { apiMsg } from '@/lib/i18n';
import { faceLabels } from '@/lib/labels';
import { choicesFromQuestion, emojiFor } from '@/lib/createHelp';

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
  // An emoji box you have not touched shows a fitting emoji for the name ("Chai" → 🍵); once you type in it, yours wins.
  const [touched, setTouched] = useState([false, false]);
  const emojiAt = (i: number) => (touched[i] ? emojis[i] ?? '' : emojis[i] || emojiFor(choices[i] ?? ''));
  const [endsAt, setEndsAt] = useState('');
  const [hideUntilVoted, setHide] = useState(true); // on by default: guess first, then see (the guess game)
  const [allowChange, setChange] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Errors show under the field they belong to, and focus moves there.
  const [fieldError, setFieldError] = useState<{ title?: string; choices?: string; end?: string }>({});
  // P3 settings stay folded: the promise is "30 seconds" (docs/DESIGN.md, Flow 3).
  const [more, setMore] = useState(false);

  // Like a WhatsApp poll: typing in the last box adds the next empty one (up to 10), so there is no "add" step.
  const setChoice = (i: number, v: string) => {
    const grow = i === choices.length - 1 && v.trim() !== '' && choices.length < 10;
    setChoices((c) => [...c.map((x, j) => (j === i ? v : x)), ...(grow ? [''] : [])]);
    if (grow) {
      setEmojis((e) => [...e, '']);
      setTouched((d) => [...d, false]);
    }
  };
  const setEmoji = (i: number, v: string) => {
    setEmojis((e) => e.map((x, j) => (j === i ? v.trim() : x)));
    setTouched((d) => d.map((x, j) => (j === i ? true : x)));
  };
  const removeChoice = (i: number) => {
    setChoices((x) => x.filter((_, j) => j !== i));
    setEmojis((x) => x.filter((_, j) => j !== i));
    setTouched((x) => x.filter((_, j) => j !== i));
  };
  const fill = (next: string[]) => {
    const list = [...next, ...(next.length < 10 ? [''] : [])];
    setChoices(list);
    setEmojis(list.map(() => ''));
    setTouched(list.map(() => false));
    setFieldError({});
  };
  // A ready-made idea: question and choices in one tap (only offered while the form is empty).
  function idea(n: number) {
    const it = t.ideas[n];
    setTitle(it.q);
    fill(it.c);
    setTimeout(() => document.querySelector('.create-preview')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }
  // Quick start: fill the shape of a common duel, then the person only types the question (and names).
  // Phone keyboards: Enter moves to the next box (it used to send a half-filled form); on the last choice it creates the duel.
  function onEnter(e: React.KeyboardEvent<HTMLInputElement>, next: string | null) {
    if (e.key !== 'Enter' || !next) return;
    e.preventDefault();
    document.getElementById(next)?.focus();
  }
  const typedChoices = choices.some((c) => c.trim());
  // "Virat, Rohit or Dhoni?" → offer those three as the choices (until you type your own).
  const fromQuestion = typedChoices ? null : choicesFromQuestion(title);
  const filledCount = choices.filter((c) => c.trim()).length;
  // The main button says what is still missing, then "Create duel".
  const buttonText = busy ? t.creating : title.trim().length < 3 ? t.needQuestion : filledCount < 2 ? t.needChoices(2 - filledCount) : t.createDuel;
  // The end time as the phone shows it (local time, no seconds), for the picker's earliest allowed value.
  const localNow = () => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
    return d.toISOString().slice(0, 16);
  };
  const filledChoices = choices.map((c, i) => ({ label: c.trim(), emoji: emojiAt(i) })).filter((c) => c.label);

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
    const kept = choices.map((c, i) => ({ c: c.trim(), e: emojiAt(i) })).filter((x) => x.c);
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
        {title.length >= 100 && <p className="small muted create-count" aria-live="polite">{t.charsLeft(120 - title.length)}</p>}
        {fieldError.title && <p className="field-error" role="alert">{fieldError.title}</p>}
        {fromQuestion && (
          <button type="button" className="create-suggest" onClick={() => fill(fromQuestion)}>
            <Sparkles size={14} strokeWidth={1.75} aria-hidden />
            <span><strong>{t.useAsChoices}</strong> <span className="muted">{fromQuestion.join(' · ')}</span></span>
          </button>
        )}
      </div>

      {/* P3: ideas, only on an empty form (a blank page is the hardest part). */}
      {!title.trim() && !typedChoices && (
        <div className="duel-group">
          <span className="label"><Lightbulb size={12} strokeWidth={1.75} aria-hidden /> {t.ideasLabel}</span>
          <div className="create-ideas">
            {t.ideas.map((it, n) => (
              <button key={n} type="button" className="chip" onClick={() => idea(n)}>{it.q}</button>
            ))}
            <button type="button" className="chip" onClick={() => fill([t.yes, t.no])}>{t.starterYesNo}</button>
          </div>
        </div>
      )}

      <div className="duel-group">
        <span className="label">{t.choicesLabel}</span>
        {choices.map((c, i) => (
          <div className="row" key={i}>
            {/* Optional emoji, shown in the choice's circle (phones open the emoji keyboard). */}
            <span className="search emoji-in">
              <input value={emojiAt(i)} maxLength={16} placeholder="🙂" aria-label={t.emojiN(i + 1)} title={!touched[i] && emojiAt(i) ? t.emojiAuto : undefined} className={!touched[i] && emojiAt(i) ? 'is-auto' : undefined} enterKeyHint="next" onKeyDown={(e) => onEnter(e, `choice-${i}`)} onFocus={(e) => e.target.select()} onChange={(e) => setEmoji(i, e.target.value)} />
            </span>
            <span className="search">
              <input id={`choice-${i}`} enterKeyHint={i < choices.length - 1 ? 'next' : 'go'} autoCapitalize="words" autoComplete="off" onKeyDown={(e) => onEnter(e, i < choices.length - 1 ? `choice-${i + 1}` : null)} data-choice value={c} maxLength={60} aria-label={t.choiceN(i + 1)} placeholder={t.choiceN(i + 1)} aria-invalid={!!fieldError.choices} onChange={(e) => { setChoice(i, e.target.value); setFieldError((f) => ({ ...f, choices: undefined })); }} />
            </span>
            {choices.length > 2 && !(i === choices.length - 1 && !c.trim()) && (
              <button type="button" className="icon-btn" aria-label={t.removeChoice(i + 1)} onClick={() => removeChoice(i)}>
                <X size={16} strokeWidth={1.75} aria-hidden />
              </button>
            )}
          </div>
        ))}
        {fieldError.choices && <p className="field-error" role="alert">{fieldError.choices}</p>}
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
        <button className="btn btn-primary btn-lg" disabled={busy}>{buttonText}</button>
      </div>
    </form>
  );
}
