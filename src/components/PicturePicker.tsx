'use client';
import { Camera, Check, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useOverlay } from '@/lib/useOverlay';
import { useT } from '@/lib/lang';
import { photoForChoice } from '@/lib/photo';

// Popular picks for a fun duel: feelings, food, sport, film, places, animals, things.
const POPULAR = ['🔥', '⭐', '❤️', '😂', '😍', '🤔', '👍', '👎', '🏆', '👑', '🫖', '☕', '🍕', '🍛', '🍔', '🍦', '🏏', '⚽', '🎬', '🎵', '🏖️', '🏔️', '🐶', '🐱', '🚗', '✈️', '📱', '🎮', '📚', '💪'];

export type Picture = { emoji: string; photo: string };

// The picture for one choice, as a sheet from the bottom (like the share panel): a big preview, "Photo from your
// phone" (camera or gallery), the suggested emoji, a grid of popular ones, or any emoji typed on the keyboard.
export default function PicturePicker({ name, value, suggested, onChange, onClose, consent, onConsent }: {
  name: string;
  value: Picture;
  suggested: string;
  onChange: (p: Picture) => void;
  onClose: () => void;
  /** The 18+ / permission tick (the law asks for it before photos; the server checks it too). */
  consent: boolean;
  onConsent: (v: boolean) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  useOverlay(onClose, { back: true });
  const close = useRef(onClose);
  close.current = onClose;

  // Escape closes; focus starts in the sheet and goes back to the circle you tapped.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    sheetRef.current?.querySelector<HTMLElement>(consent ? '.picker-photo' : '.picker-consent input')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus?.({ preventScroll: true });
    };
  }, []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setFailed(false);
    try {
      onChange({ emoji: value.emoji, photo: await photoForChoice(file) });
      onClose();
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }
  const pick = (emoji: string) => {
    onChange({ emoji, photo: '' });
    onClose();
  };
  const emojis = suggested ? [suggested, ...POPULAR.filter((e) => e !== suggested)] : POPULAR;
  const shown = value.photo ? null : value.emoji;

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <section ref={sheetRef} className="sheet picker" role="dialog" aria-modal="true" aria-label={t.pictureFor(name)} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label={t.close}><X size={16} strokeWidth={1.75} aria-hidden /></button>

        <div className="picker-head">
          <span className={'picker-preview' + (value.photo ? ' has-photo' : '')} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {value.photo ? <img src={value.photo} alt="" /> : <span>{shown || '🙂'}</span>}
          </span>
          <span>
            <h2>{t.pictureFor(name)}</h2>
            <p className="small muted">{t.pictureNote}</p>
          </span>
        </div>

        {/* Phones offer camera or gallery for this; the photo is made small on the phone before it is sent. */}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <label className="small picker-consent">
          <input type="checkbox" checked={consent} onChange={(e) => onConsent(e.target.checked)} />
          <span>{t.photoConsent} <Link href="/terms" target="_blank" className="text-link">{t.termsLink}</Link></span>
        </label>
        <button type="button" className="btn btn-primary btn-lg picker-photo" disabled={busy || !consent} aria-describedby={consent ? undefined : 'consent-first'} onClick={() => fileRef.current?.click()}>
          <Camera size={16} strokeWidth={1.75} aria-hidden /> {busy ? t.photoWorking : value.photo ? t.photoChange : t.photoFromPhone}
        </button>
        {!consent && <p id="consent-first" className="small muted">{t.photoConsentFirst}</p>}
        {failed && <p className="small duel-error" role="alert">{t.photoFailed}</p>}

        <p className="label">{suggested ? t.emojiSuggested : t.emojiPopular}</p>
        <div className="picker-grid" role="listbox" aria-label={t.emojiPopular}>
          {emojis.map((e, n) => (
            <button
              key={e}
              type="button"
              role="option"
              aria-selected={!value.photo && value.emoji === e}
              className={'picker-emoji' + (n === 0 && suggested ? ' is-suggested' : '') + (!value.photo && value.emoji === e ? ' is-on' : '')}
              onClick={() => pick(e)}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="picker-foot">
          <span className="search emoji-in picker-type">
            <input maxLength={16} placeholder="✍️" aria-label={t.emojiType} enterKeyHint="done" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onClose())} onChange={(e) => e.target.value.trim() && onChange({ emoji: e.target.value.trim(), photo: '' })} />
          </span>
          <span className="small muted">{t.emojiType}</span>
          {(value.photo || value.emoji) && (
            <button type="button" className="link-like small muted picker-none" onClick={() => pick('')}>{t.pictureRemove}</button>
          )}
        </div>
        <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}><Check size={15} strokeWidth={2} aria-hidden /> {t.pictureDone}</button>
      </section>
    </div>,
    document.body,
  );
}
