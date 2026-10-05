'use client';
import { ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '@/lib/useOverlay';
import { useT } from '@/lib/lang';
import { photoForChoice } from '@/lib/photo';

// Popular picks for a fun duel: feelings, food, sport, film, places, animals, things.
const POPULAR = ['🔥', '⭐', '❤️', '😂', '😍', '🤔', '👍', '👎', '🏆', '👑', '🫖', '☕', '🍕', '🍛', '🍔', '🍦', '🏏', '⚽', '🎬', '🎵', '🏖️', '🏔️', '🐶', '🐱', '🚗', '✈️', '📱', '🎮', '📚', '💪'];

export type Picture = { emoji: string; photo: string };

// The picture for one choice, as a sheet from the bottom (owner, Oct 2026: no consent box here, no separate photo
// button, no "type any emoji", nothing shown before you pick): the preview at the top (an empty "add" circle until
// you choose), then one grid whose first tile adds a photo from the phone (camera or gallery), then the suggested
// emoji and the popular ones. Picking anything closes the sheet. The Rules say who may add photos (18+, with
// permission); adding one means you confirm it.
export default function PicturePicker({ name, value, suggested, onChange, onClose }: {
  name: string;
  value: Picture;
  suggested: string;
  onChange: (p: Picture) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  useOverlay(onClose, { back: true });
  const close = useRef(onClose);
  close.current = onClose;

  // Escape closes; focus starts on the first tile and goes back to the circle you tapped.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    sheetRef.current?.querySelector<HTMLElement>('.picker-add')?.focus({ preventScroll: true });
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
  // The add-photo tile plus 29 emoji: five full rows of six.
  const emojis = (suggested ? [suggested, ...POPULAR.filter((e) => e !== suggested)] : POPULAR).slice(0, 29);
  const chosen = !!(value.photo || value.emoji);

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <section ref={sheetRef} className="sheet picker" role="dialog" aria-modal="true" aria-label={t.pictureFor(name)} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label={t.close}><X size={16} strokeWidth={1.75} aria-hidden /></button>

        <div className="picker-head">
          {/* What this choice shows now: its photo, its emoji, or (nothing chosen yet) an empty "add" circle. */}
          <span className={'picker-preview' + (value.photo ? ' has-photo' : '') + (chosen ? '' : ' is-empty')} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {value.photo ? <img src={value.photo} alt="" /> : value.emoji ? <span>{value.emoji}</span> : <ImagePlus size={28} strokeWidth={1.5} />}
          </span>
          <span>
            <h2>{t.pictureFor(name)}</h2>
            <p className="small muted">{t.pictureNote}</p>
          </span>
        </div>

        {/* Phones offer camera or gallery for this; the photo is made small on the phone before it is sent. */}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        {failed && <p className="small duel-error" role="alert">{t.photoFailed}</p>}

        <p className="label">{suggested ? t.emojiSuggested : t.emojiPopular}</p>
        <div className="picker-grid" role="listbox" aria-label={t.emojiPopular}>
          {/* The first tile adds a photo (the same size as the emoji, so it reads as one more choice). */}
          <button type="button" className={'picker-emoji picker-add' + (value.photo ? ' is-on' : '')} disabled={busy} aria-label={busy ? t.photoWorking : value.photo ? t.photoChange : t.photoFromPhone} onClick={() => fileRef.current?.click()}>
            {busy ? <span className="picker-busy" aria-hidden /> : <ImagePlus size={24} strokeWidth={1.75} aria-hidden />}
          </button>
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

        {chosen && <button type="button" className="link-like small muted picker-none" onClick={() => pick('')}>{t.pictureRemove}</button>}
      </section>
    </div>,
    document.body,
  );
}
