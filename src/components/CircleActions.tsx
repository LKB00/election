'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { apiMsg } from '@/lib/i18n';
import { useLang, useT } from '@/lib/lang';

async function act(id: string, body: object) {
  const res = await fetch(`/api/circles/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  const data = await res?.json().catch(() => null);
  return { ok: !!res?.ok, error: data?.error as string | undefined };
}

/** "Invite people": the circle's invite link, shared like any link (WhatsApp first on phones). */
export function CircleInvite({ id, name, invite }: { id: string; name: string; invite: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${window.location.origin}/c/${id}?k=${invite}`;
    const text = t.circleInviteText(name);
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text, url });
        return;
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
      }
    }
    await navigator.clipboard?.writeText(`${text} ${url}`).catch(() => undefined);
    setCopied(true);
  }
  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={share}><Share2 size={16} strokeWidth={2} aria-hidden /> {t.circleInvite}</button>
      {copied && <p className="small muted" role="status">{t.linkCopied}</p>}
    </>
  );
}

/** Join with the invite link (signed in). */
export function CircleJoin({ id, invite }: { id: string; invite: string }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function join() {
    setBusy(true);
    const r = await act(id, { action: 'join', invite });
    if (r.ok) return router.replace(`/c/${id}`);
    setBusy(false);
    setError(r.error ? apiMsg(lang, r.error) : t.errGeneric);
  }
  return (
    <>
      <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={join}>{t.circleJoin}</button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </>
  );
}

/** P3, last: leave (members), or a new invite link / delete (the maker), each with one confirm. */
export function CircleManage({ id, mine }: { id: string; mine: boolean }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [asking, setAsking] = useState<'' | 'leave' | 'delete'>('');
  const [msg, setMsg] = useState('');
  async function go(action: 'leave' | 'delete' | 'invite') {
    const r = await act(id, { action });
    if (!r.ok) return setMsg(r.error ? apiMsg(lang, r.error) : t.errGeneric);
    if (action === 'invite') {
      setMsg(t.circleNewLinkDone);
      return router.refresh();
    }
    router.replace('/you');
  }
  return (
    <div className="circle-manage">
      {asking ? (
        <div className="row wrap">
          <span className="small">{asking === 'delete' ? t.circleDeleteQ : t.circleLeaveQ}</span>
          <button type="button" className="btn btn-primary" onClick={() => go(asking)}>{asking === 'delete' ? t.circleDelete : t.circleLeave}</button>
          <button type="button" className="btn btn-ghost" onClick={() => setAsking('')}>{t.cancel}</button>
        </div>
      ) : (
        <div className="row wrap">
          {mine && <button type="button" className="link-like small muted" onClick={() => go('invite')}>{t.circleNewLink}</button>}
          <button type="button" className="link-like small muted" onClick={() => setAsking(mine ? 'delete' : 'leave')}>{mine ? t.circleDelete : t.circleLeave}</button>
        </div>
      )}
      {msg && <p className="small muted" role="status">{msg}</p>}
    </div>
  );
}
