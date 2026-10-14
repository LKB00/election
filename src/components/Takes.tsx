'use client';
import { useState } from 'react';
import { PenLine } from 'lucide-react';
import { apiMsg } from '@/lib/i18n';
import { useLang, useT } from '@/lib/lang';
import { TAKES_FIRST, TAKE_MAX } from '@/lib/limits';
import type { PollView } from '@/lib/polls';

// "Say why in one line" (docs/DESIGN.md, "One line"), after you vote: what a few people said (P2, no names, only once
// results are open), a few at a time, and one quiet button to add your own (P3). Each line can be reported.
export default function Takes({ poll, q, onPoll }: { poll: PollView; q: string; onPoll: (p: PollView) => void }) {
  const t = useT();
  const lang = useLang();
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState(poll.myTake ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [shown, setShown] = useState(TAKES_FIRST);
  const [reported, setReported] = useState<string[]>([]);

  async function save(value: string) {
    setBusy(true);
    setMsg('');
    const res = await fetch(`/api/polls/${poll.id}/take${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: value }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok && data?.poll) {
      onPoll(data.poll);
      setText(data.poll.myTake ?? '');
      setWriting(false);
    } else setMsg(data?.error ? apiMsg(lang, data.error) : t.saveFail2);
  }

  async function report(id: string) {
    setReported((r) => [...r, id]);
    await fetch(`/api/polls/${poll.id}/take/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => null);
  }

  const lines = poll.takes.filter((x) => !reported.includes(x.id));
  if (!poll.takesOn) return null;
  return (
    <div className="duel-group takes">
      {lines.length > 0 && (
        <>
          <p className="label">{t.takesTitle}</p>
          <ul className="takes__list">
            {lines.slice(0, shown).map((x) => (
              <li key={x.id} className="takes__item">
                <span className="takes__text">“{x.text}”</span>
                <span className="small muted">
                  {x.pick && <>{t.takePicked(x.pick)} · </>}
                  <button type="button" className="link-like small muted" onClick={() => report(x.id)}>{t.takeReport}</button>
                </span>
              </li>
            ))}
          </ul>
          {lines.length > shown && (
            <button type="button" className="link-like small" onClick={() => setShown((n) => n + TAKES_FIRST)}>{t.takesMore(Math.min(TAKES_FIRST, lines.length - shown))}</button>
          )}
        </>
      )}
      {reported.length > 0 && <p className="small muted" role="status">{t.takeReported}</p>}

      {writing ? (
        <form
          className="takes__form"
          onSubmit={(e) => {
            e.preventDefault();
            save(text);
          }}
        >
          <label className="small" htmlFor={`take-${poll.id}`}>{t.takeAsk}</label>
          <input
            id={`take-${poll.id}`}
            value={text}
            maxLength={TAKE_MAX}
            enterKeyHint="send"
            autoFocus
            placeholder={t.takePh}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="small muted">{t.takeNote}</p>
          <div className="row wrap">
            <button type="submit" className="btn btn-primary" disabled={busy || text.trim().length < 2}>{t.takeSave}</button>
            <button type="button" className="link-like small muted" onClick={() => (setWriting(false), setText(poll.myTake ?? ''), setMsg(''))}>{t.cancel}</button>
          </div>
        </form>
      ) : poll.myTake ? (
        <p className="small takes__mine">
          <span className="muted">{t.takeYours}</span> “{poll.myTake}”{' '}
          <button type="button" className="link-like small" onClick={() => setWriting(true)}>{t.takeEdit}</button>{' · '}
          <button type="button" className="link-like small muted" disabled={busy} onClick={() => save('')}>{t.takeRemove}</button>
        </p>
      ) : (
        <button type="button" className="btn btn-ghost takes__add" onClick={() => setWriting(true)}>
          <PenLine size={16} strokeWidth={2} aria-hidden /> {t.takeAdd}
        </button>
      )}
      {msg && <p className="small txt-bad" role="alert">{msg}</p>}
    </div>
  );
}
