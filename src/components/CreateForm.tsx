'use client';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
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

  const setChoice = (i: number, v: string) => setChoices((c) => c.map((x, j) => (j === i ? v : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
    if (res?.ok && data?.id) return router.push(`/p/${data.id}`);
    setError(data?.error ?? 'Something went wrong. Please try again.');
    setBusy(false);
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <div className="field">
        <label className="label" htmlFor="title">Your question</label>
        <input id="title" className="input" value={title} maxLength={120} placeholder="Who is the best finisher?" onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="field">
        <span className="label">Choices (2 to 10)</span>
        {choices.map((c, i) => (
          <div className="row" key={i}>
            <input className="input" value={c} maxLength={60} aria-label={`Choice ${i + 1}`} placeholder={`Choice ${i + 1}`} onChange={(e) => setChoice(i, e.target.value)} />
            {choices.length > 2 && (
              <button type="button" className="btn btn-ghost" aria-label={`Remove choice ${i + 1}`} onClick={() => setChoices((x) => x.filter((_, j) => j !== i))}><X size={16} /></button>
            )}
          </div>
        ))}
        {choices.length < 10 && (
          <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setChoices((x) => [...x, ''])}><Plus size={16} />Add choice</button>
        )}
      </div>

      <div className="field">
        <label className="label" htmlFor="desc">Details (optional)</label>
        <textarea id="desc" className="input" rows={2} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="field">
        <label className="label" htmlFor="cat">Category</label>
        <select id="cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      <div className="field">
        <label className="label" htmlFor="end">Ends at (optional)</label>
        <input id="end" type="datetime-local" className="input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
      </div>

      <label className="toggle">
        <input type="checkbox" checked={hideUntilVoted} onChange={(e) => setHide(e.target.checked)} />
        <span><strong>Hide results until people vote</strong><br /><span className="small">Stops people copying the crowd.</span></span>
      </label>
      <label className="toggle">
        <input type="checkbox" checked={allowChange} onChange={(e) => setChange(e.target.checked)} />
        <span><strong>Let people change their vote</strong><br /><span className="small">Until the duel ends.</span></span>
      </label>

      {error && <p className="duel-error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-lg" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Creating…' : 'Create duel'}</button>
    </form>
  );
}
