'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiMsg } from '@/lib/i18n';
import { useLang, useT } from '@/lib/lang';

/** /admin: verify a profile by its link, and the verified list with Remove. */
export default function VerifyAdmin({ adminKey, list }: { adminKey: string; list: { id: string; name: string; avatar: string }[] }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [who, setWho] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function send(target: string, on: boolean) {
    setBusy(true);
    setMsg('');
    const res = await fetch('/api/admin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: adminKey, who: target, on }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setWho('');
      router.refresh();
    } else setMsg(data?.error ? apiMsg(lang, data.error) : t.errGeneric);
  }
  return (
    <section className="block admin-stats" aria-label={t.verifyTitle}>
      <h2>{t.verifyTitle}</h2>
      <p className="small muted">{t.verifyLead}</p>
      <form className="row verify-form" onSubmit={(e) => { e.preventDefault(); if (who.trim()) send(who, true); }}>
        <label className="search"><span className="sr-only">{t.verifyPh}</span><input value={who} placeholder={t.verifyPh} onChange={(e) => setWho(e.target.value)} /></label>
        <button className="btn btn-primary" disabled={busy || !who.trim()}>{t.verifyBtn}</button>
      </form>
      {msg && <p className="small duel-error" role="alert">{msg}</p>}
      {list.length ? (
        <ul className="index-list">
          {list.map((u) => (
            <li key={u.id} className="verify-row">
              <a href={`/u/${u.id}`} className="plain-link">{u.avatar} {u.name}</a>
              <button type="button" className="link-like muted small" disabled={busy} onClick={() => send(u.id, false)}>{t.verifyRemove}</button>
            </li>
          ))}
        </ul>
      ) : <p className="small muted">{t.verifyNone}</p>}
    </section>
  );
}
