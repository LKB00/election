'use client';
import { LogOut, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Profile } from '@/lib/auth';
import { AVATARS } from '@/lib/avatars';
import { apiMsg } from '@/lib/i18n';
import { useLang, useT } from '@/lib/lang';
import { SignInPanel } from './SignIn';

// The You page's moving parts (docs/DESIGN.md, "Profiles").

/** Signed out: the profile screen right on the page; when it is done, the page shows the profile. */
export function YouSignIn() {
  const router = useRouter();
  return <SignInPanel onPage onDone={() => router.refresh()} />;
}

/** Your face and name (yellow = you), with Edit in place. */
export function ProfileCard({ user }: { user: Profile }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/me/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, avatar }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error ? apiMsg(lang, data.error) : t.errGeneric);
    setError('');
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="profile-card">
        <span className="profile-face" aria-hidden>{user.avatar}</span>
        <span className="profile-who">
          <span className="profile-name">{user.name}</span>
          <span className="small muted">{t.youSignedIn}</span>
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>{t.editProfile}</button>
      </div>
    );
  }
  return (
    <form className="profile-card is-editing" onSubmit={save}>
      <label className="create-label" htmlFor="profile-name">{t.yourName}</label>
      <input id="profile-name" className="input" value={name} maxLength={30} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
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
      <span className="row wrap">
        <button className="btn btn-primary" disabled={busy}>{t.saveProfile}</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setEditing(false); setName(user.name); setAvatar(user.avatar); setError(''); }}>{t.cancel}</button>
      </span>
    </form>
  );
}

/** Sign out, and delete the profile (asked once more first). P3: at the bottom, quiet. */
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
    <div className="profile-actions">
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => call('/api/auth/logout', 'POST', '/you')}>
        <LogOut size={16} strokeWidth={2} aria-hidden /> {t.signOut}
      </button>
      {asking ? (
        <div className="duel-group" role="alertdialog" aria-label={t.deleteProfile}>
          <p className="small">{t.deleteProfileAsk}</p>
          <span className="row wrap">
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => call('/api/me/profile', 'DELETE', '/you?deleted=1')}>{t.deleteProfileYes}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setAsking(false)}>{t.cancel}</button>
          </span>
        </div>
      ) : (
        <button type="button" className="text-link profile-delete" onClick={() => setAsking(true)}>
          <Trash2 size={14} strokeWidth={2} aria-hidden /> {t.deleteProfile}
        </button>
      )}
    </div>
  );
}
