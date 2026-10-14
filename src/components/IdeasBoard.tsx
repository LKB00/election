'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb, Plus, Share2 } from 'lucide-react';
import type { PollView } from '@/lib/polls';
import { apiMsg } from '@/lib/i18n';
import { faceLabels } from '@/lib/labels';
import { useLang, useT } from '@/lib/lang';
import { IDEAS_PER_PERSON, MAX_CHOICE } from '@/lib/limits';
import { INDIA_TZ, dateLocale } from '@/lib/time';

// "Ideas first" (docs/DESIGN.md, "Ideas first"): while ideas are open, the poll page is this board instead of the
// ballot. P1: add an idea (one box, one button). P2: the list so far and when voting opens. The maker also gets
// "Start voting now" (P2 for them); everyone gets "Ask for ideas" to share the link.
export default function IdeasBoard({ poll, mine }: { poll: PollView; mine: boolean }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const ideas = poll.options.filter((o) => !o.isOther);
  const faces = faceLabels(ideas.map((o) => o.label));
  const until = new Date(poll.ideas!.until);
  const timeLeft = until.getTime() > Date.now();
  const when = until.toLocaleString(dateLocale(lang), { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: INDIA_TZ });

  async function post(path: string, body: object) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    return { ok: !!res?.ok, error: data?.error ? apiMsg(lang, data.error) : t.saveFail };
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    const r = await post(`/api/polls/${poll.id}/idea`, { label: text });
    setMsg(r.ok ? { ok: true, text: t.brainAdded } : { ok: false, text: r.error });
    if (r.ok) {
      setText('');
      router.refresh();
    }
  }
  async function start() {
    const r = await post(`/api/polls/${poll.id}/manage`, { action: 'startVoting' });
    if (r.ok) router.refresh();
    else setMsg({ ok: false, text: r.error });
  }
  async function share() {
    const url = `${window.location.origin}/p/${poll.id}?src=link`;
    const words = t.brainShareText(poll.title);
    try {
      if (navigator.share) return await navigator.share({ text: words, url });
    } catch {
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${words} ${url}`)}`, '_blank', 'noopener');
  }

  return (
    <div className="tot ideas-board">
      <div className="tot-q">
        <p className="label duel-today"><Lightbulb size={13} strokeWidth={2} aria-hidden /> {t.brainLabel}</p>
        <h1 className="display duel-q">{poll.title}</h1>
        {poll.description && <p className="duel-desc">{poll.description}</p>}
        <p className="small muted">{timeLeft ? t.brainOpens(when) : t.brainWaitTwo}</p>
      </div>

      <form className="ideas-add" onSubmit={add}>
        <label className="search">
          <Plus size={16} strokeWidth={1.75} aria-hidden />
          <span className="sr-only">{t.brainAdd}</span>
          <input value={text} maxLength={MAX_CHOICE} placeholder={t.brainAdd} enterKeyHint="send" autoComplete="off" onChange={(e) => setText(e.target.value)} />
        </label>
        <button className="btn btn-primary" disabled={!text.trim() || busy}>{t.brainAddBtn}</button>
      </form>
      {msg && <p className={'small ' + (msg.ok ? 'duel-friend' : 'duel-error')} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      <p className="small muted">{t.brainNote(IDEAS_PER_PERSON)}</p>

      <section className="al-block" aria-label={t.brainCount(ideas.length)}>
        <h2 className="al-block__title">{ideas.length ? t.brainCount(ideas.length) : t.brainNone}</h2>
        {ideas.length > 0 && (
          <ul className="al-listcard">
            {ideas.map((o, i) => (
              <li key={o.id} className="al-row">
                <span className="al-row__disc" style={{ '--tone': 'var(--p-input)' } as React.CSSProperties} aria-hidden>{o.emoji || faces[i]}</span>
                <span className="al-row__main"><span className="al-row__title">{o.label}</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="ideas-actions">
        <button type="button" className="btn btn-ghost" onClick={share}><Share2 size={16} strokeWidth={2} aria-hidden /> {t.brainShare}</button>
        {mine && (
          <button type="button" className="btn btn-primary" onClick={start} disabled={busy || ideas.length < 2}>{t.brainStart}</button>
        )}
      </div>
      {mine && <p className="small muted">{t.brainStartNote}</p>}
    </div>
  );
}
