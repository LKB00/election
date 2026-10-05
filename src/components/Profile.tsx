'use client';
import { LogOut, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '@/lib/useOverlay';
import type { Profile } from '@/lib/auth';
import { AVATARS } from '@/lib/avatars';
import { apiMsg } from '@/lib/i18n';
import { useLang, useT } from '@/lib/lang';
import dynamic from 'next/dynamic';
import { SignInPanel } from './SignIn';
import Spot from './Spot';
import { MAX_NAME } from '@/lib/limits';

const SignInSheet = dynamic(() => import('./SignIn'), { ssr: false });

// The You page's moving parts (docs/DESIGN.md, "Profiles").

/** Signed out: the profile screen right on the page; when it is done, the page shows the profile. */
/** Start a poll, signed out (owner: "when they click on create poll, open the login screen"): the profile screen comes
 * first, then the empty form (the page refreshes once the profile is ready). Voting never needs this. */
export function CreateSignIn() {
  const router = useRouter();
  return <SignInPanel onDone={() => router.refresh()} />;
}

export function YouSignIn({ full = false, startBack = false }: { full?: boolean; startBack?: boolean }) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState<null | 'new' | 'back'>(null);
  // The maker's page (signed out) shows the whole screen; the You tab starts calm: the picture, the one promise that
  // matters most, one button. The name and faces open in the sheet only when tapped.
  if (full) return <SignInPanel onPage startBack={startBack} onDone={() => router.refresh()} />;
  return (
    <div className="spot-empty">
      <Spot kind="lock" />
      <h2 className="spot-empty__title">{t.signTitleYou}</h2>
      <p className="spot-empty__line">{t.youIntro}</p>
      <button type="button" className="btn btn-primary btn-lg spot-empty__go" onClick={() => setOpen('new')}>{t.signTitleYou}</button>
      <button type="button" className="text-link small spot-empty__more signin-switch" onClick={() => setOpen('back')}>{t.haveProfile}</button>
      {open && <SignInSheet onPage startBack={open === 'back'} onClose={() => setOpen(null)} onDone={() => { setOpen(null); router.refresh(); }} />}
    </div>
  );
}

/** Your face and name (yellow = you), with Edit in place. */
export function ProfileCard({ user }: { user: Profile }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  // Shown at once after Save (closing the sheet steps back in history, which would undo a page refresh made then).
  const [me, setMe] = useState(user);
  return (
    <>
      <div className="profile-card">
        <span className="profile-face" aria-hidden>{me.avatar}</span>
        <span className="profile-who">
          <span className="profile-name">{me.name}</span>
          <span className="small muted">{t.youSignedIn}</span>
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>{t.editProfile}</button>
      </div>
      {editing && <EditProfileSheet user={me} onSaved={setMe} onClose={() => setEditing(false)} />}
    </>
  );
}

/** Edit profile (owner: "this screen should be about edit profile"): its own sheet over the dimmed page, with only the
 * name, the face and Save / Cancel. Nothing else on the page can be tapped until it is saved or closed. */
function EditProfileSheet({ user, onSaved, onClose }: { user: Profile; onSaved: (u: Profile) => void; onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  useOverlay(onClose, { back: true });
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/me/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, avatar }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error ? apiMsg(lang, data.error) : t.errGeneric);
    onSaved(data?.user ?? { ...user, name: name.trim(), avatar });
    onClose();
  }

  return createPortal(
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form ref={ref} className="sheet profile-edit" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" onSubmit={save}>
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label={t.close}><X size={18} strokeWidth={2} aria-hidden /></button>
        <h2 id="profile-edit-title" className="profile-edit-title">{t.editProfile}</h2>
        {/* The face you picked, large, so the change is seen at once. */}
        <span className="profile-face profile-edit-face" aria-hidden>{avatar}</span>
        <label className="create-label" htmlFor="profile-name">{t.yourName}</label>
        <input id="profile-name" className="input" value={name} maxLength={MAX_NAME} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
        <fieldset className="signin-faces">
          <legend className="create-label">{t.pickFace}</legend>
          {AVATARS.map((a) => (
            <label key={a} className={'signin-face' + (a === avatar ? ' is-on' : '')}>
              <input type="radio" name="avatar" value={a} checked={a === avatar} onChange={() => setAvatar(a)} />
              <span aria-hidden>{a}</span>
            </label>
          ))}
        </fieldset>
        {error && <p className="duel-error" role="alert">{error}</p>}
        <div className="preview-actions">
          <button className="btn btn-primary btn-lg" disabled={busy}>{t.saveProfile}</button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={onClose} disabled={busy}>{t.cancel}</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

/** Sign out, and delete the profile (asked once more first). P3: at the bottom, one quiet "Account" list. */
export function ProfileActions() {
  const t = useT();
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  async function call(url: string, method: string, after: string) {
    setBusy(true);
    await fetch(url, { method }).catch(() => null);
    router.replace(after);
    router.refresh();
  }
  return (
    <section className="al-block" aria-label={t.accountTitle}>
      <h2 className="al-block__title">{t.accountTitle}</h2>
      <ul className="al-listcard">
        <li>
          <button type="button" className="al-row profile-row" disabled={busy} onClick={() => call('/api/auth/logout', 'POST', '/you')}>
            <span className="al-row__disc" style={{ '--tone': 'var(--sand)' } as React.CSSProperties}><LogOut size={20} strokeWidth={1.75} aria-hidden /></span>
            <span className="al-row__main"><span className="al-row__title">{t.signOut}</span></span>
          </button>
        </li>
        <li>
          {asking ? (
            <div className="profile-ask" role="alertdialog" aria-label={t.deleteProfile}>
              <p className="small">{t.deleteProfileAsk}</p>
              <span className="row wrap">
                <button type="button" className="btn btn-danger" disabled={busy} onClick={() => call('/api/me/profile', 'DELETE', '/you?deleted=1')}>{t.deleteProfileYes}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setAsking(false)}>{t.cancel}</button>
              </span>
            </div>
          ) : (
            <button type="button" className="al-row profile-row is-danger" onClick={() => setAsking(true)}>
              <span className="al-row__disc" style={{ '--tone': 'var(--negative-soft)' } as React.CSSProperties}><Trash2 size={20} strokeWidth={1.75} aria-hidden /></span>
              <span className="al-row__main"><span className="al-row__title">{t.deleteProfile}</span></span>
            </button>
          )}
        </li>
      </ul>
    </section>
  );
}
