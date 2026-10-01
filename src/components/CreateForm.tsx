'use client';
import { useRouter } from 'next/navigation';
import { ChevronDown, Clock, EyeOff, Plus, Repeat, X } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES } from '@/lib/validation';

export default function CreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [choices, setChoices] = useState(['', '']);
  const [endsAt, setEndsAt] = useState('');
  const [hideUntilVoted, setHide] = useState(false);
  const [allowChange, setChange] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Errors show under the field they belong to, and focus moves there.
  const [fieldError, setFieldError] = useState<{ title?: string; choices?: string }>({});
  // P3 settings stay folded: the promise is "30 seconds" (docs/DESIGN.md, Flow 3).
  const [more, setMore] = useState(false);

  const setChoice = (i: number, v: string) => setChoices((c) => c.map((x, j) => (j === i ? v : x)));

  function check() {
    const filled = choices.map((c) => c.trim()).filter(Boolean);
    const errs: { title?: string; choices?: string } = {};
    if (title.trim().length < 3) errs.title = 'Your question needs at least 3 letters.';
    if (filled.length < 2) errs.choices = 'Add at least 2 choices.';
    else if (new Set(filled.map((c) => c.toLowerCase())).size !== filled.length) errs.choices = 'Two choices are the same. Make each one different.';
    setFieldError(errs);
    if (errs.title) document.getElementById('title')?.focus();
    else if (errs.choices) document.querySelector<HTMLInputElement>('input[aria-label^="Choice"]')?.focus();
    return !errs.title && !errs.choices;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !check()) return;
    setBusy(true);
    setError('');
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        category,
        options: choices.map((c) => c.trim()).filter(Boolean),
        hideUntilVoted,
        allowChange,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.id) return router.push(`/p/${data.id}?new=1`);
    setError(data?.error ?? 'Something went wrong. Please try again.');
    setBusy(false);
  }

  // Built only from patricka parts: .search fields, .chip choices, .me-row + .switch settings.
  return (
    <form className="me-stack" onSubmit={submit}>
      <div className="duel-group">
        <label className="label" htmlFor="title">Your question</label>
        <span className="search">
          <input id="title" value={title} maxLength={120} placeholder="Virat, Rohit or Dhoni?" aria-invalid={!!fieldError.title} onChange={(e) => { setTitle(e.target.value); setFieldError((f) => ({ ...f, title: undefined })); }} />
        </span>
        {fieldError.title && <p className="field-error" role="alert">{fieldError.title}</p>}
      </div>

      <div className="duel-group">
        <span className="label">Choices · 2 to 10</span>
        {choices.map((c, i) => (
          <div className="row" key={i}>
            <span className="search">
              <input value={c} maxLength={60} aria-label={`Choice ${i + 1}`} placeholder={`Choice ${i + 1}`} aria-invalid={!!fieldError.choices} onChange={(e) => { setChoice(i, e.target.value); setFieldError((f) => ({ ...f, choices: undefined })); }} />
            </span>
            {choices.length > 2 && (
              <button type="button" className="icon-btn" aria-label={`Remove choice ${i + 1}`} onClick={() => setChoices((x) => x.filter((_, j) => j !== i))}>
                <X size={16} strokeWidth={1.75} aria-hidden />
              </button>
            )}
          </div>
        ))}
        {fieldError.choices && <p className="field-error" role="alert">{fieldError.choices}</p>}
        {choices.length < 10 && (
          <button type="button" className="chip duel-add" onClick={() => setChoices((x) => [...x, ''])}>
            <Plus size={14} strokeWidth={1.75} aria-hidden /> Add a choice
          </button>
        )}
      </div>

      <button type="button" className="chip duel-add" aria-expanded={more} onClick={() => setMore((m) => !m)}>
        <ChevronDown size={14} strokeWidth={1.75} aria-hidden style={{ transform: more ? 'rotate(180deg)' : undefined }} /> More options
      </button>

      {more && (
      <>
      <div className="duel-group">
        <label className="label" htmlFor="desc">Details · optional</label>
        <span className="search">
          <input id="desc" value={description} maxLength={300} placeholder="One line of context" onChange={(e) => setDescription(e.target.value)} />
        </span>
      </div>

      <div className="duel-group">
        <span className="label">Category</span>
        <div className="row wrap" role="radiogroup" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={category === c} className={'chip' + (category === c ? ' chip-on' : '')} onClick={() => setCategory(c)}>
              {c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="duel-group">
        <label className="label" htmlFor="end">Ends · optional</label>
        <span className="search">
          <Clock size={14} strokeWidth={1.75} aria-hidden />
          <input id="end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </span>
      </div>

      <div className="me-stack">
        <button type="button" className="me-row" onClick={() => setHide((v) => !v)} aria-pressed={hideUntilVoted}>
          <EyeOff size={20} strokeWidth={1.75} aria-hidden />
          <span><strong>Hide results until people vote</strong><span className="small muted">Stops people copying the crowd</span></span>
          <span className={'switch' + (hideUntilVoted ? ' is-on' : '')} aria-hidden />
        </button>
        <button type="button" className="me-row" onClick={() => setChange((v) => !v)} aria-pressed={allowChange}>
          <Repeat size={20} strokeWidth={1.75} aria-hidden />
          <span><strong>Let people change their vote</strong><span className="small muted">Until the duel ends</span></span>
          <span className={'switch' + (allowChange ? ' is-on' : '')} aria-hidden />
        </button>
      </div>
      </>
      )}

      {error && <p className="duel-error" role="alert">{error}</p>}
      <div className="row">
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Creating…' : 'Create duel'}</button>
      </div>
    </form>
  );
}
