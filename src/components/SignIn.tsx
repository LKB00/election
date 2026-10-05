'use client';
import { Fingerprint, Lock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type { Profile } from '@/lib/auth';
import { AVATARS } from '@/lib/avatars';
import { apiMsg } from '@/lib/i18n';
import { useLang, useT } from '@/lib/lang';
import { useOverlay } from '@/lib/useOverlay';
import { localPollKeys } from './MyPolls';
import Spot from './Spot';
import { MAX_NAME, MIN_NAME } from '@/lib/limits';

// The profile screen (docs/DESIGN.md, "Profiles"). Asked for only when someone makes a poll; voting never needs it.
// Light on purpose (owner: "information heavy… cognitive load"): the picture (a locked ballot box), a title and one
// line, the two things we ask for (a name and a face), one ink button that hands over to the phone's fingerprint, face
// or screen lock (a passkey), and the promise in one line under it. Signing back in is only the picture, the title,
// one line and the button. "Already have a profile?" / "New here?" switches between the two.

async function post(url: string, body?: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) }).catch(() => null);
  return { ok: !!res?.ok, data: await res?.json().catch(() => null) };
}

export function SignInPanel({ onDone, startBack = false, onPage = false }: { onDone: (user: Profile) => void; startBack?: boolean; /** On the You page (not over Create). */ onPage?: boolean }) {
  const t = useT();
  const lang = useLang();
  const [back, setBack] = useState(startBack);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(browserSupportsWebAuthn()), []);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!back && name.trim().length < MIN_NAME) {
      setError(apiMsg(lang, 'Your name needs at least 2 letters.'));
      document.getElementById('signin-name')?.focus();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const o = await post(back ? '/api/auth/login/options' : '/api/auth/register/options', back ? {} : { name, avatar });
      if (!o.ok) throw new Error(o.data?.error ?? '');
      const proof = back ? await startAuthentication({ optionsJSON: o.data }) : await startRegistration({ optionsJSON: o.data });
      const v = await post(back ? '/api/auth/login/verify' : '/api/auth/register/verify', proof);
      if (!v.ok) throw new Error(v.data?.error ?? '');
      // Polls made on this phone before (each proven by its private key) join the profile.
      const mine = localPollKeys();
      if (mine.length) await post('/api/me/claim', { polls: mine });
      const me = await fetch('/api/me/profile').then((r) => r.json()).catch(() => null);
      if (!me?.user) throw new Error('');
      onDone(me.user);
    } catch (err) {
      // The phone's own "Cancel" (or a timeout) is not a failure: just say it stopped.
      const msg = err instanceof Error ? err.message : '';
      setError(err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'AbortError') ? t.passkeyStopped : msg ? apiMsg(lang, msg) : t.errGeneric);
      setBusy(false);
    }
  }

  return (
    <form className="signin" onSubmit={go} noValidate>
      <Spot kind="lock" size={back ? 104 : 120} />
      <h2 className="signin-title">{back ? t.signTitleBack : onPage ? t.signTitleYou : t.signTitleNew}</h2>
      <p className="signin-lead">{back ? t.signLeadBack : t.signLeadNew}</p>
      {!back && (
        <>
          <label className="create-label" htmlFor="signin-name">{t.yourName}</label>
          <input id="signin-name" className="input" value={name} maxLength={MAX_NAME} autoComplete="nickname" placeholder={t.namePlaceholder} onChange={(e) => setName(e.target.value)} />
          <fieldset className="signin-faces">
            <legend className="create-label">{t.pickFace}</legend>
            {AVATARS.map((a) => (
              <label key={a} className={'signin-face' + (a === avatar ? ' is-on' : '')}>
                <input type="radio" name="avatar" value={a} checked={a === avatar} onChange={() => setAvatar(a)} />
                <span aria-hidden>{a}</span>
              </label>
            ))}
          </fieldset>
        </>
      )}
      {supported ? (
        <button className="btn btn-primary btn-lg signin-go" disabled={busy}>
          <Fingerprint size={20} strokeWidth={2} aria-hidden /> {busy ? t.passkeyWaiting : back ? t.signInPasskey : t.continuePasskey}
        </button>
      ) : (
        <p className="duel-error" role="alert">{t.noPasskey}</p>
      )}
      {error && <p className="duel-error" role="alert">{error}</p>}
      {/* The promise, once, where the decision is made (new profile only: someone signing back in already knows it). */}
      {!back && <p className="small muted signin-trust"><Lock size={14} strokeWidth={2} aria-hidden /> {t.signTrust}</p>}
      <button type="button" className="text-link signin-switch" onClick={() => { setBack(!back); setError(''); }}>
        {back ? t.newHere : t.haveProfile}
      </button>
    </form>
  );
}

/** The same screen as a sheet over Create (the poll stays filled in behind it). */
export default function SignInSheet({ onDone, onClose, startBack = false, onPage = false }: { onDone: (user: Profile) => void; onClose: () => void; startBack?: boolean; onPage?: boolean }) {
  const t = useT();
  useOverlay(onClose, { back: true });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus?.({ preventScroll: true });
    };
  }, [onClose]);
  return createPortal(
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="sheet signin-sheet" role="dialog" aria-modal="true" aria-label={t.signTitleNew}>
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label={t.close}><X size={18} strokeWidth={2} aria-hidden /></button>
        <SignInPanel onDone={onDone} startBack={startBack} onPage={onPage} />
      </div>
    </div>,
    document.body,
  );
}
