'use client';
import { Fingerprint, Lock, Smartphone, X } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { confirmPhoneCode, firebaseCode, firebaseOn, googleClientId, googleTicket, loadGoogleButton, nativeGoogleOn, phoneE164, phoneOn, sendPhoneCode, ticketFromGoogle, warmFirebase } from '@/lib/firebaseClient';

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

/** Google's own "Continue with Google" button. On Chrome for Android a tap slides up the phone's own Google account
 * picker (FedCM); elsewhere Google shows its chooser. Its look is Google's (they require it); our screen around it
 * stays ours. If Google's script cannot load, `onFail` puts our own button (Google's window) back. */
function GoogleSheetButton({ lang, onToken, onFail }: { lang: string; onToken: (idToken: string) => void; onFail: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const handler = useRef(onToken);
  handler.current = onToken;
  useEffect(() => {
    let gone = false;
    loadGoogleButton()
      .then((id) => {
        if (gone || !box.current) return;
        id.initialize({
          client_id: googleClientId,
          callback: (r: { credential?: string }) => r.credential && handler.current(r.credential),
          context: 'signin',
          ux_mode: 'popup',
          use_fedcm_for_button: true,
          use_fedcm_for_prompt: true,
          itp_support: true,
        });
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        id.renderButton(box.current, {
          type: 'standard', theme: dark ? 'filled_black' : 'outline', size: 'large', shape: 'pill', text: 'continue_with',
          logo_alignment: 'center', width: Math.min(400, box.current.offsetWidth || 320), locale: lang === 'hi' ? 'hi' : 'en_IN',
        });
      })
      .catch(() => !gone && onFail());
    return () => {
      gone = true;
    };
  }, [lang, onFail]);
  return <div ref={box} className="signin-google" />;
}

export function SignInPanel({ onDone, startBack = false, onPage = false }: { onDone: (user: Profile) => void; startBack?: boolean; /** On the You page (not over Create). */ onPage?: boolean }) {
  const t = useT();
  const lang = useLang();
  // Two small steps at most (owner, Oct 2026: "overwhelming… simplify the journey"):
  //   choose: Continue with Google (name from Google, no typing) or Use fingerprint or face. Nothing to fill in.
  //   name:   only for a new fingerprint/face profile (or a Google account with no usable name): one field.
  // No face to pick: one is given at random, and You → Edit changes it.
  const [step, setStep] = useState<'choose' | 'name' | 'phone' | 'code'>(firebaseOn || startBack ? 'choose' : 'name');
  const [name, setName] = useState('');
  const [avatar] = useState(() => AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(browserSupportsWebAuthn()), []);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  // A Google / phone ticket waiting for a name (only when Google gave none we can use).
  const [pending, setPending] = useState<string | null>(null);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const [sheet, setSheet] = useState(nativeGoogleOn);
  const noSheet = useCallback(() => setSheet(false), []);
  // Firebase loads as this screen opens, so a tap on Google never waits (phones block windows opened after a wait).
  useEffect(() => {
    if (firebaseOn) warmFirebase(lang);
  }, [lang]);

  const to = (s: typeof step, focus?: string) => {
    setError('');
    setStep(s);
    if (focus) setTimeout(() => document.getElementById(focus)?.focus(), 0);
  };

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
    const known =
      err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'AbortError') ? t.passkeyStopped
      : c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request' || c === 'auth/user-cancelled' ? t.signCancelled
      : c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment' || c === 'auth/web-storage-unsupported' ? t.googleInApp
      : c === 'auth/invalid-phone-number' || c === 'auth/missing-phone-number' ? t.phoneInvalid
      : c === 'auth/invalid-verification-code' || c === 'auth/missing-verification-code' ? t.codeWrong
      : c === 'auth/code-expired' ? t.codeExpired
      : c === 'auth/too-many-requests' || c === 'auth/quota-exceeded' ? t.tooManyTries
      : c === 'auth/network-request-failed' ? t.noNetTry
      : msg && !c ? apiMsg(lang, msg) : '';
    // Anything else: the general message plus Google's short code, so one screenshot says what went wrong.
    setError(known || (c ? `${t.errGeneric} (${c.replace('auth/', '')})` : t.errGeneric));
    setBusy(false);
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

  /** Firebase's ticket goes to our server: a known sign-in opens its profile; a new one makes one with this name. */
  async function sendTicket(token: string, as: string) {
    const v = await post('/api/auth/firebase', { token, name: as, avatar });
    if (!v.ok) throw new Error(v.data?.error ?? '');
    if (v.data?.needName) {
      setPending(token);
      setName(as);
      setBusy(false);
      to('name', 'signin-name');
      return;
    }
    await finish();
  }

  /** Fingerprint or face: signs in an existing profile, or makes one with the name typed. */
  async function passkey(isNew: boolean) {
    const o = await post(isNew ? '/api/auth/register/options' : '/api/auth/login/options', isNew ? { name, avatar } : {});
    if (!o.ok) throw new Error(o.data?.error ?? '');
    const proof = isNew ? await startRegistration({ optionsJSON: o.data }) : await startAuthentication({ optionsJSON: o.data });
    const v = await post(isNew ? '/api/auth/register/verify' : '/api/auth/login/verify', proof);
    if (!v.ok) throw new Error(v.data?.error ?? '');
    await finish();
  }

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (step === 'phone') return sendCode();
    if (step === 'code') return checkCode();
    if (step !== 'name') return;
    if (name.trim().length < MIN_NAME) {
      setError(apiMsg(lang, 'Your name needs at least 2 letters.'));
      document.getElementById('signin-name')?.focus();
      return;
    }
    void run(() => (pending ? sendTicket(pending, name) : passkey(true)));
  }

  const google = () => void run(async () => { const g = await googleTicket(lang); await sendTicket(g.token, g.name); });
  const googleSheet = (idToken: string) => void run(async () => { const g = await ticketFromGoogle(idToken, lang); await sendTicket(g.token, g.name); });
  // "Use fingerprint or face": straight to the phone's prompt when signing back in; a new profile asks for a name first.
  const useFace = () => (startBack ? void run(() => passkey(false)) : to('name', 'signin-name'));
  const signBack = () => void run(() => passkey(false));

  function sendCode() {
    const e164 = phoneE164(phone);
    if (!e164) {
      setError(t.phoneInvalid);
      return;
    }
    void run(async () => {
      confirmation.current = await sendPhoneCode(e164, 'signin-captcha', lang);
      setCode('');
      setBusy(false);
      to('code', 'signin-code');
    });
  }

  function checkCode() {
    if (!confirmation.current || !/^\d{6}$/.test(code.trim())) {
      setError(t.codeWrong);
      return;
    }
    void run(async () => sendTicket(await confirmPhoneCode(confirmation.current!, code.trim(), lang), ''));
  }

  const title = step === 'name' ? t.nameTitle : startBack ? t.signTitleBack : onPage ? t.signTitleYou : t.signTitleNew;
  return (
    <form className="signin" onSubmit={go} noValidate>
      {step === 'choose' && <Spot kind="lock" size={104} />}
      <h2 className="signin-title">{title}</h2>
      {step === 'choose' && <p className="signin-lead">{t.signLeadChoose}</p>}

      {step === 'choose' && (
        <>
          {firebaseOn && (sheet ? (
            <GoogleSheetButton lang={lang} onToken={googleSheet} onFail={noSheet} />
          ) : (
            <button type="button" className="btn btn-primary btn-lg signin-go" disabled={busy} onClick={google}><GoogleMark /> {busy ? t.signingIn : t.continueGoogle}</button>
          ))}
          {supported ? (
            <button type="button" className={'btn btn-lg signin-alt ' + (firebaseOn ? 'btn-ghost' : 'btn-primary')} disabled={busy} onClick={useFace}>
              <Fingerprint size={20} strokeWidth={2} aria-hidden /> {busy && !firebaseOn ? t.passkeyWaiting : t.usePasskey}
            </button>
          ) : !firebaseOn && <p className="duel-error" role="alert">{t.noPasskey}</p>}
          {phoneOn && <button type="button" className="btn btn-ghost btn-lg signin-alt" disabled={busy} onClick={() => to('phone', 'signin-phone')}><Smartphone size={18} strokeWidth={2} aria-hidden /> {t.continuePhone}</button>}
        </>
      )}

      {step === 'name' && (
        <>
          <label className="sr-only" htmlFor="signin-name">{t.yourName}</label>
          <input id="signin-name" className="input" value={name} maxLength={MAX_NAME} autoComplete="nickname" placeholder={t.namePlaceholder} onChange={(e) => setName(e.target.value)} />
          {supported || pending ? (
            <button className="btn btn-primary btn-lg signin-go" disabled={busy}>
              {!pending && <Fingerprint size={20} strokeWidth={2} aria-hidden />} {busy ? (pending ? t.signingIn : t.passkeyWaiting) : t.continueBtn}
            </button>
          ) : <p className="duel-error" role="alert">{t.noPasskey}</p>}
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
        </>
      )}

      {error && <p className="duel-error" role="alert">{error}</p>}
      {phoneOn && <div id="signin-captcha" />}
      {/* The promise, once, where the decision is made. */}
      {step === 'choose' && <p className="small muted signin-trust"><Lock size={14} strokeWidth={2} aria-hidden /> {t.signTrust}</p>}
      {/* One quiet way back (or, for a new fingerprint profile, to sign in with one made before). */}
      {step === 'name' && !pending && <button type="button" className="text-link signin-switch" onClick={signBack} disabled={busy}>{t.havePasskey}</button>}
      {step !== 'choose' && (firebaseOn || startBack) && <button type="button" className="text-link small signin-switch" onClick={() => { setPending(null); to('choose'); }}>{t.back}</button>}
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
