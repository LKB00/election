'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { apiMsg } from '@/lib/i18n';
import { useLang, useT } from '@/lib/lang';
import { choicesFromQuestion, emojiFor } from '@/lib/createHelp';
import { MAX_CHOICES, MIN_CHOICES, ROOM_MAX } from '@/lib/limits';
import { rememberMyPoll } from './MyPolls';
// Loaded only when someone needs to sign in.
const SignInSheet = dynamic(() => import('./SignIn'), { ssr: false });

const HOUR = 3_600_000;
/** How many question rows show at first (a few at a time); "Add a question" adds one more, up to ROOM_MAX. */
const FIRST_ROWS = 3;
type Row = { q: string; c: string };

// Poll night (docs/DESIGN.md, "Poll night"): a name, then a few questions of your own, each with its choices. The
// questions become a pack that starts now, for the room only (never in public lists), shown on a big screen one by one.
export default function RoomForm({ signedIn = false }: { signedIn?: boolean }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [signed, setSigned] = useState(signedIn);
  const [ask, setAsk] = useState(false);
  const [name, setName] = useState('');
  const [rows, setRows] = useState<Row[]>(Array.from({ length: FIRST_ROWS }, () => ({ q: '', c: '' })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // A row's choices: what was typed (commas or new lines), else read out of the question ("Tea or coffee?").
  const choicesOf = (r: Row) => {
    const typed = r.c.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    return typed.length ? typed : (choicesFromQuestion(r.q) ?? []);
  };
  const filled = rows.filter((r) => r.q.trim());
  const set = (n: number, patch: Partial<Row>) => setRows((all) => all.map((r, i) => (i === n ? { ...r, ...patch } : r)));
  // Ideas only fill empty rows: never write over what someone typed.
  const fillIdeas = () => {
    const ideas = [...t.roomIdeas];
    setRows((all) => {
      const next = all.map((r) => (r.q.trim() ? r : (() => { const i = ideas.shift(); return i ? { q: i[0], c: i[1] } : r; })()));
      while (ideas.length && next.length < Math.min(ROOM_MAX, FIRST_ROWS + 2)) { const i = ideas.shift()!; next.push({ q: i[0], c: i[1] }); }
      return next;
    });
  };

  function problem(): string {
    if (name.trim().length < 3) return t.roomErrName;
    if (filled.length < 2) return t.roomErrFew;
    const bad = rows.findIndex((r) => r.q.trim() && (choicesOf(r).length < MIN_CHOICES || choicesOf(r).length > MAX_CHOICES));
    if (bad >= 0) return t.roomErrChoices(bad + 1);
    return '';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = problem();
    if (p) return setError(p);
    if (!signed) return setAsk(true);
    send();
  }
  async function send() {
    setBusy(true);
    setError('');
    const ends = new Date(Date.now() + 24 * HOUR).toISOString();
    const polls = filled.map((r) => {
      const options = choicesOf(r);
      // Numbers open at once: the room watches the bars move on the big screen.
      return { title: r.q.trim(), options, emojis: options.map((o) => emojiFor(o) || ''), kind: 'choice', category: 'friends', hideUntilVoted: false, endsAt: ends };
    });
    const res = await fetch('/api/packs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'room', title: name.trim(), polls }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.id) {
      for (const id of data.pollIds as string[]) rememberMyPoll(id, data.manageKey);
      return router.replace(`/pack/${data.id}?new=1`);
    }
    setBusy(false);
    if (res?.status === 401) {
      setSigned(false);
      return setAsk(true);
    }
    setError(data?.error ? apiMsg(lang, data.error) : t.errGeneric);
  }

  return (
    <form className="pack-form room-form" onSubmit={submit}>
      <label className="field">
        <span className="label">{t.roomName}</span>
        <input className="input" value={name} maxLength={80} placeholder={t.roomNamePh} onChange={(e) => setName(e.target.value)} />
      </label>
      <ol className="room-rows">
        {rows.map((r, n) => {
          const auto = !r.c.trim() && r.q.trim() ? choicesFromQuestion(r.q) : null;
          return (
            <li key={n} className="room-row">
              <label className="field">
                <span className="label">{t.roomQ(n + 1)}</span>
                <input className="input" value={r.q} maxLength={120} placeholder={n === 0 ? t.roomQPh : ''} onChange={(e) => set(n, { q: e.target.value })} />
              </label>
              <label className="field">
                <span className="small muted">{t.roomChoices}</span>
                <input className="input" value={r.c} maxLength={300} placeholder={auto ? auto.join(', ') : t.roomChoicesPh} onChange={(e) => set(n, { c: e.target.value })} />
              </label>
            </li>
          );
        })}
      </ol>
      <div className="row wrap">
        {rows.length < ROOM_MAX && (
          <button type="button" className="btn btn-ghost" onClick={() => setRows((all) => [...all, { q: '', c: '' }])}>
            <Plus size={16} strokeWidth={2} aria-hidden /> {t.roomAdd}
          </button>
        )}
        {rows.some((r) => !r.q.trim()) && (
          <button type="button" className="link-like small" onClick={fillIdeas}>
            <Sparkles size={14} strokeWidth={2} aria-hidden /> {t.roomIdeasBtn}
          </button>
        )}
      </div>
      <p className="small muted">{t.roomNote}</p>
      {error && <p className="field-error" role="alert">{error}</p>}
      {ask && (
        <SignInSheet
          onClose={() => setAsk(false)}
          onDone={() => {
            setAsk(false);
            setSigned(true);
            send();
          }}
        />
      )}
      {!signed && <p className="small muted">{t.createSignHint}</p>}
      <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? t.packMaking : t.roomMake(Math.max(filled.length, 2))}</button>
    </form>
  );
}
