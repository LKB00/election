'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ChevronRight, Clock, Copy, Image as ImageIcon, MessageCircle, PenLine, Plus, Repeat, Square, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { MakerView } from '@/lib/maker';
import { apiMsg } from '@/lib/i18n';
import { useLang, useT } from '@/lib/lang';
import { keyBytes, PUBLIC_KEY } from './ResultAlert';

// The poll maker's controls (docs/DESIGN.md, "Poll maker tools"). Everything posts to /api/polls/<id>/manage, which
// checks the profile again; the page refreshes after each change.
async function manage(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/polls/${id}/manage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  return { ok: !!res?.ok, data: await res?.json().catch(() => null) };
}

/** Share the poll link (tagged so the maker's view can count where votes came from). */
export function ShareLink({ id, title }: { id: string; title: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const url = (src: string) => `${window.location.origin}/p/${id}?src=${src}`;
  const text = () => t.shareTextAsk(title);
  return (
    <div className="maker-share">
      <a className="btn btn-primary btn-lg" href="#" onClick={(e) => { e.preventDefault(); window.open(`https://wa.me/?text=${encodeURIComponent(`${text()} ${url('wa')}`)}`, '_blank', 'noopener'); }}>
        <MessageCircle size={18} strokeWidth={2} aria-hidden /> {t.sharePollLink}
      </a>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url('link'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            window.prompt(t.copyThis, url('link'));
          }
        }}
      >
        <Copy size={16} strokeWidth={2} aria-hidden /> {copied ? t.linkCopied : t.copyLink}
      </button>
    </div>
  );
}

/** "Results are in": the story picture, shared as a file where the phone can, else opened to save. */
export function ResultsCard({ id, votes }: { id: string; votes: number }) {
  const t = useT();
  const lang = useLang();
  // The vote count in the address: a fresh picture whenever the result changes (not an old saved copy).
  const src = `/api/results/${id}?n=${votes}${lang === 'hg' ? '&l=hg' : ''}`;
  const [busy, setBusy] = useState(false);
  async function share() {
    setBusy(true);
    try {
      const blob = await fetch(src).then((r) => r.blob());
      const file = new File([blob], 'results.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: `${window.location.origin}/p/${id}?src=wa` });
      else window.open(src, '_blank', 'noopener');
    } catch {
      /* the person closed the share menu */
    }
    setBusy(false);
  }
  return (
    <div className="maker-results">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="maker-results-img" loading="lazy" width={108} height={192} />
      <div className="maker-results-side">
        <p className="small muted">{t.resultsCardLine}</p>
        <button type="button" className="btn btn-primary" onClick={share} disabled={busy}>
          <ImageIcon size={16} strokeWidth={2} aria-hidden /> {t.shareResults}
        </button>
      </div>
    </div>
  );
}

/** Suggested choices waiting for the maker: Add or Delete. */
export function Suggestions({ id, items }: { id: string; items: MakerView['pending'] }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [error, setError] = useState('');
  async function decide(sid: string, add: boolean) {
    const r = await manage(id, { action: add ? 'add' : 'drop', sid });
    if (!r.ok) return setError(r.data?.error ? apiMsg(lang, r.data.error) : t.errGeneric);
    router.refresh();
  }
  return (
    <>
      <ul className="al-listcard">
        {items.map((s) => (
          <li key={s.id} className="al-row maker-suggest">
            <span className="al-row__main">
              <span className="al-row__title">{s.label}</span>
              <span className="al-row__meta">{t.suggestedBy(s.n)}</span>
            </span>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => decide(s.id, true)}><Plus size={14} strokeWidth={2.25} aria-hidden /> {t.addChoice}</button>
            <button type="button" className="icon-btn" aria-label={`${t.dropChoice}: ${s.label}`} onClick={() => decide(s.id, false)}><Trash2 size={16} strokeWidth={2} aria-hidden /></button>
          </li>
        ))}
      </ul>
      {error && <p className="duel-error" role="alert">{error}</p>}
    </>
  );
}

/** Length buttons and End now (asked once more). */
export function Lengths({ id }: { id: string }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function go(body: Record<string, unknown>) {
    setBusy(true);
    const r = await manage(id, body);
    setBusy(false);
    if (!r.ok) return setError(r.data?.error ? apiMsg(lang, r.data.error) : t.errGeneric);
    setError('');
    setAsking(false);
    // Say what changed (the page shows it at the top).
    router.replace(`/p/${id}/manage?done=${body.action === 'end' ? 'end' : 'length'}`);
    router.refresh();
  }
  return (
    <div className="maker-lengths">
      <div className="row wrap" role="group" aria-label={t.lengthTitle}>
        {['hour', 'tonight', 'days3', 'week'].map((k) => (
          <button key={k} type="button" className="chip" disabled={busy} onClick={() => go({ action: 'length', length: k })}>
            <Clock size={14} strokeWidth={2} aria-hidden /> {t.lengthNames[k]}
          </button>
        ))}
      </div>
      {asking ? (
        <div className="duel-group" role="alertdialog" aria-label={t.endNow}>
          <p className="small">{t.endAsk}</p>
          <span className="row wrap">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => go({ action: 'end' })}>{t.endYes}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setAsking(false)}>{t.cancel}</button>
          </span>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost" onClick={() => setAsking(true)}><Square size={14} strokeWidth={2} aria-hidden /> {t.endNow}</button>
      )}
      {error && <p className="duel-error" role="alert">{error}</p>}
    </div>
  );
}

/** Fix a typo (before the first vote): the question, the details and each choice's words. */
export function FixTypo({ view }: { view: MakerView }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(view.title);
  const [description, setDescription] = useState(view.description);
  const [opts, setOpts] = useState(view.options);
  const [error, setError] = useState('');
  const rating = view.kind === 'rating';
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await manage(view.id, { action: 'edit', title, description, options: rating ? [] : opts });
    if (!r.ok) return setError(r.data?.error ? apiMsg(lang, r.data.error) : t.errGeneric);
    setOpen(false);
    router.refresh();
  }
  if (!open) {
    return (
      <button type="button" className="al-row maker-row" onClick={() => setOpen(true)}>
        <span className="al-row__disc" style={{ '--tone': 'var(--p-feedback)' } as React.CSSProperties}><PenLine size={20} strokeWidth={1.75} aria-hidden /></span>
        <span className="al-row__main"><span className="al-row__title">{t.fixTypo}</span><span className="al-row__meta">{t.fixTypoNote}</span></span>
        <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
      </button>
    );
  }
  return (
    <form className="maker-edit" onSubmit={save}>
      <label className="create-label" htmlFor="edit-title">{t.yourQuestion}</label>
      <textarea id="edit-title" className="create-q" rows={2} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      <label className="create-label" htmlFor="edit-desc">{t.details}</label>
      <input id="edit-desc" className="input" value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
      {!rating && (
        <>
          <span className="create-label">{t.choicesTitle}</span>
          {opts.map((o, n) => (
            <input key={o.id} className="input" aria-label={t.choiceN(n + 1)} value={o.label} maxLength={60} onChange={(e) => setOpts(opts.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)))} />
          ))}
        </>
      )}
      {error && <p className="duel-error" role="alert">{error}</p>}
      <span className="row wrap">
        <button className="btn btn-primary">{t.saveChanges}</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>{t.cancel}</button>
      </span>
    </form>
  );
}

/** One alert when the first votes are in (only where phone alerts are switched on). */
export function MilestoneAlert({ id, n }: { id: string; n: number }) {
  const t = useT();
  const lang = useLang();
  const [state, setState] = useState<'ask' | 'on' | 'busy'>('ask');
  if (!PUBLIC_KEY) return null;
  async function turnOn() {
    setState('busy');
    try {
      if ((await Notification.requestPermission()) !== 'granted') return setState('ask');
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
      const r = await manage(id, { action: 'alert', subscription: sub.toJSON(), lang });
      setState(r.ok ? 'on' : 'ask');
    } catch {
      setState('ask');
    }
  }
  return state === 'on' ? (
    <p className="small muted maker-alert-on" role="status"><Bell size={14} strokeWidth={2} aria-hidden /> {t.alertOn}</p>
  ) : (
    <button type="button" className="al-row maker-row" onClick={turnOn} disabled={state === 'busy'}>
      <span className="al-row__disc" style={{ '--tone': 'var(--p-trust)' } as React.CSSProperties}><Bell size={20} strokeWidth={1.75} aria-hidden /></span>
      <span className="al-row__main"><span className="al-row__title">{t.alertTen(n)}</span></span>
      <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
    </button>
  );
}

export function AskAgainRow({ id }: { id: string }) {
  const t = useT();
  return (
    <Link href={`/create?again=${id}`} className="al-row">
      <span className="al-row__disc" style={{ '--tone': 'var(--p-control)' } as React.CSSProperties}><Repeat size={20} strokeWidth={1.75} aria-hidden /></span>
      <span className="al-row__main"><span className="al-row__title">{t.askAgain}</span><span className="al-row__meta">{t.askAgainNote}</span></span>
      <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
    </Link>
  );
}


/** "Called it": mark what happened (asked once more), from the maker's page on any phone. */
export function MarkOutcome({ id, options }: { id: string; options: { id: string; label: string }[] }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function mark(o: { id: string; label: string }) {
    if (busy || !window.confirm(t.calledMarkConfirm(o.label))) return;
    setBusy(true);
    const r = await manage(id, { action: 'outcome', optionId: o.id });
    setBusy(false);
    if (!r.ok) return setError(r.data?.error ? apiMsg(lang, r.data.error) : t.errGeneric);
    router.replace(`/p/${id}/manage?done=outcome`);
    router.refresh();
  }
  return (
    <div className="maker-lengths">
      <p className="small muted">{t.calledMarkNote}</p>
      <div className="row" role="group" aria-label={t.calledMarkTitle}>
        {options.map((o) => (
          <button key={o.id} type="button" className="chip" disabled={busy} onClick={() => mark(o)}>{o.label}</button>
        ))}
      </div>
      {error && <p className="duel-error" role="alert">{error}</p>}
    </div>
  );
}
