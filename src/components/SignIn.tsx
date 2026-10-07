'use client';
import { Fingerprint, Lock, Smartphone, X } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
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
import { confirmPhoneCode, firebaseCode, firebaseOn, googleTicket, phoneE164, phoneOn, sendPhoneCode } from '@/lib/firebaseClient';

// The profile screen (docs/DESIGN.md, "Profiles"). Asked for only when someone makes a poll; voting never needs it.
// Light on purpose (owner: "information heavy… cognitive load"): the picture (a locked ballot box), a title and one
// line, the two things we ask for (a name and a face), one ink button that hands over to the phone's fingerprint, face
// or screen lock (a passkey), and the promise in one line under it. Signing back in is only the picture, the title,
// one line and the button. "Already have a profile?" / "New here?" switches between the two.
// Google and phone number (owner, Oct 2026), once the Firebase keys are in: two quiet buttons under the ink one, after
// "or". Phone opens two small steps (your number, then the SMS code), each with a way back to the other ways.

/** Google's "G", in the text colour (a logo in its own colours would break the one-palette rule). */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3ZM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22ZM6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9.1L6.4 14ZM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.5L6.4 10C7.2 7.7 9.4 5.9 12 5.9Z" />
    </svg>
  );
}

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
  // Google / phone: which step is open, the number, the code, and a ticket waiting for a name (a new person who tapped
  // Google or phone on "Already have a profile?").
  const [step, setStep] = useState<'main' | 'phone' | 'code'>('main');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const confirmation = useRef<ConfirmationResult | null>(null);

  /** A new profile needs a name first, whichever way it signs in. */
  function nameOk() {
    if (back || name.trim().length >= MIN_NAME) return true;
    setError(apiMsg(lang, 'Your name needs at least 2 letters.'));
    document.getElementById('signin-name')?.focus();
    return false;
  }

  /** Signed in: polls made on this phone before (each proven by its private key) join the profile. */
  async function finish() {
    const mine = localPollKeys();
    if (mine.length) await post('/api/me/claim', { polls: mine });
    const me = await fetch('/api/me/profile').then((r) => r.json()).catch(() => null);
    if (!me?.user) throw new Error('');
    onDone(me.user);
  }

  function fail(err: unknown) {
    const c = firebaseCode(err);
    const msg = err instanceof Error ? err.message : '';
    setError(
      // The phone's own "Cancel" (or a timeout) is not a failure: just say it stopped.
      err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'AbortError') ? t.passkeyStopped
      : c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request' || c === 'auth/user-cancelled' ? t.signCancelled
      : c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment' || c === 'auth/web-storage-unsupported' ? t.googleInApp
      : c === 'auth/invalid-phone-number' || c === 'auth/missing-phone-number' ? t.phoneInvalid
      : c === 'auth/invalid-verification-code' || c === 'auth/missing-verification-code' ? t.codeWrong
      : c === 'auth/code-expired' ? t.codeExpired
      : c === 'auth/too-many-requests' || c === 'auth/quota-exceeded' ? t.tooManyTries
      : c === 'auth/network-request-failed' ? t.noNetTry
      : msg && !c ? apiMsg(lang, msg) : t.errGeneric,
    );
    setBusy(false);
  }

  /** Firebase's ticket goes to our server: a known sign-in opens its profile; a new one makes one with the name above. */
  async function sendTicket(token: string) {
    const v = await post('/api/auth/firebase', back ? { token } : { token, name, avatar });
    if (!v.ok) throw new Error(v.data?.error ?? '');
    if (v.data?.needName) {
      // Nobody has signed in this way yet: ask for a name and a face, keep the ticket (it lasts an hour).
      setPending(token);
      setBack(false);
      setStep('main');
      setNotice(t.needName);
      setBusy(false);
      return;
    }
    await finish();
  }

  async function passkey() {
    const o = await post(back ? '/api/auth/login/options' : '/api/auth/register/options', back ? {} : { name, avatar });
    if (!o.ok) throw new Error(o.data?.error ?? '');
    const proof = back ? await startAuthentication({ optionsJSON: o.data }) : await startRegistration({ optionsJSON: o.data });
    const v = await post(back ? '/api/auth/login/verify' : '/api/auth/register/verify', proof);
    if (!v.ok) throw new Error(v.data?.error ?? '');
    await finish();
  }

  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (err) {
      fail(err);
    }
  }

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (step === 'phone') return sendCode();
    if (step === 'code') return checkCode();
    if (!nameOk()) return;
    void run(() => (pending ? sendTicket(pending) : passkey()));
  }

  function google() {
    if (!nameOk()) return;
    void run(async () => sendTicket(await googleTicket(lang)));
  }

  function openPhone() {
    if (!nameOk()) return;
    setError('');
    setStep('phone');
    setTimeout(() => document.getElementById('signin-phone')?.focus(), 0);
  }

  function sendCode() {
    const e164 = phoneE164(phone);
    if (!e164) {
      setError(t.phoneInvalid);
      return;
    }
    void run(async () => {
      confirmation.current = await sendPhoneCode(e164, 'signin-captcha', lang);
      setCode('');
      setStep('code');
      setBusy(false);
      setTimeout(() => document.getElementById('signin-code')?.focus(), 0);
    });
  }

  function checkCode() {
    if (!confirmation.current || !/^\d{6}$/.test(code.trim())) {
      setError(t.codeWrong);
      return;
    }
    void run(async () => sendTicket(await confirmPhoneCode(confirmation.current!, code.trim(), lang)));
  }

  const otherWays = () => {
    setStep('main');
    setError('');
  };

  return (
    <form className="signin" onSubmit={go} noValidate>
      <Spot kind="lock" size={back ? 104 : 120} />
      <h2 className="signin-title">{back ? t.signTitleBack : onPage ? t.signTitleYou : t.signTitleNew}</h2>
      <p className="signin-lead">{back ? (firebaseOn ? t.signLeadBackAll : t.signLeadBack) : t.signLeadNew}</p>
      {notice && step === 'main' && <p className="small duel-friend" role="status">{notice}</p>}
      {!back && step === 'main' && (
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
      {step === 'phone' && (
        <>
          <label className="create-label" htmlFor="signin-phone">{t.phoneLabel}</label>
          <input id="signin-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={phone} placeholder={t.phonePlaceholder} onChange={(e) => setPhone(e.target.value)} />
          <button className="btn btn-primary btn-lg signin-go" disabled={busy}>{busy ? t.sendingCode : t.sendCode}</button>
        </>
      )}
      {step === 'code' && (
        <>
          <label className="create-label" htmlFor="signin-code">{t.codeLabel(phoneE164(phone) ?? phone)}</label>
          <input id="signin-code" className="input signin-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} placeholder={t.codePlaceholder} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          <button className="btn btn-primary btn-lg signin-go" disabled={busy}>{busy ? t.signingIn : t.confirmCode}</button>
          <button type="button" className="text-link signin-switch" onClick={() => { setStep('phone'); setError(''); }}>{t.changeNumber}</button>
        </>
      )}
      {step === 'main' && (pending ? (
        <button className="btn btn-primary btn-lg signin-go" disabled={busy}>{busy ? t.signingIn : t.makeProfile}</button>
      ) : supported ? (
        <button className="btn btn-primary btn-lg signin-go" disabled={busy}>
          <Fingerprint size={20} strokeWidth={2} aria-hidden /> {busy ? t.passkeyWaiting : back ? t.signInPasskey : t.continuePasskey}
        </button>
      ) : (
        <p className="duel-error" role="alert">{t.noPasskey}</p>
      ))}
      {/* Google and phone number: quiet buttons after "or", so the ink button stays the one main action. */}
      {firebaseOn && step === 'main' && !pending && (
        <>
          <p className="signin-or" aria-hidden><span>{t.orWith}</span></p>
          <button type="button" className="btn btn-ghost btn-lg signin-alt" disabled={busy} onClick={google}><GoogleMark /> {t.continueGoogle}</button>
          {phoneOn && <button type="button" className="btn btn-ghost btn-lg signin-alt" disabled={busy} onClick={openPhone}><Smartphone size={18} strokeWidth={2} aria-hidden /> {t.continuePhone}</button>}
        </>
      )}
      {error && <p className="duel-error" role="alert">{error}</p>}
      {/* Firebase's invisible "are you a person?" check for the SMS lives here. */}
      {phoneOn && <div id="signin-captcha" />}
      {/* The promise, once, where the decision is made (new profile only: someone signing back in already knows it). */}
      {!back && step === 'main' && <p className="small muted signin-trust"><Lock size={14} strokeWidth={2} aria-hidden /> {t.signTrust}</p>}
      {step === 'main' ? (
        <button type="button" className="text-link signin-switch" onClick={() => { setBack(!back); setError(''); setNotice(''); setPending(null); }}>
          {back ? t.newHere : t.haveProfile}
        </button>
      ) : (
        <button type="button" className="text-link signin-switch" onClick={otherWays}>{t.otherWays}</button>
      )}
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
