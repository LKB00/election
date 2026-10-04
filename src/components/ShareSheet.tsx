'use client';
import { Check, Download, EyeOff, Link2, MessageCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '@/lib/useOverlay';
import type { PollOption, PollView } from '@/lib/polls';
import { useLang, useT } from '@/lib/lang';

// "Show your ink": the moment after voting when people share. Built for the least drop-off:
// WhatsApp first (one tap, message already written), the secret ballot on by default
// (curiosity: "Guess who I picked?"), a story image with a small QR for Status/Instagram,
// where links cannot be tapped. See docs/DESIGN.md (Sharing).
export default function ShareSheet({ poll, pick, shareCode, onClose }: { poll: PollView; pick: PollOption; shareCode: string; onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const hi = lang === 'en' ? '' : `&l=${lang}`;
  const [secret, setSecret] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  // The card image is made on the server; it floats in once it has loaded (grey placeholder until then).
  const [loaded, setLoaded] = useState<string | null>(null);

  // Full name: a last name alone can be ambiguous ("Gandhi").
  const last = pick.label;
  // An open link carries the proof (o=) that lets its preview show your pick; a secret one has none, so editing the
  // address cannot reveal it.
  const mode = secret || !poll.myShareProof ? '&s=1' : `&o=${poll.myShareProof}`;
  const link = () => `${window.location.origin}/p/${poll.id}?f=${shareCode}${mode}${hi}`;
  const card = `/api/card/${poll.id}?f=${shareCode}${mode}${hi}`;
  // Wordle lesson: a short, spoiler-free line anyone can read in a chat (and your exit poll result, if you made one).
  const mark = poll.myGuess ? ` · ${t.exitMark(poll.myGuess.correct)}` : '';
  const message = secret ? t.msgSecret(poll.title, mark) : t.msgOpen(poll.title, last, mark);
  const text = () => `${message} ${link()}`;

  // Phones: the page behind stays still, and the Back button closes the sheet (not the page).
  useOverlay(onClose, { back: true });

  // Like any sheet: Escape closes it, focus moves into it, Tab stays inside, and focus goes back to the Share button after.
  const sheetRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    sheetRef.current?.querySelector<HTMLElement>('button, a')?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const items = [...sheetRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.copyThis, link());
    }
  }

  // The image is fetched as soon as the panel opens (and again when the secret switch changes): iPhones only open their
  // share menu straight from a tap, so it must be ready before the tap, not downloaded after it.
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(card)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => live && setImage({ url: card, blob }))
      .catch(() => {}); // tried again on tap
    return () => {
      live = false;
    };
  }, [card]);

  // Phones: share the image and the message together (Status, Instagram). Otherwise: download the image.
  async function shareImage() {
    setBusy(true);
    setImageFailed(false);
    try {
      let blob = image?.url === card ? image.blob : null;
      if (!blob) {
        const res = await fetch(card);
        if (!res.ok) throw new Error(String(res.status));
        blob = await res.blob();
      }
      const file = new File([blob], 'i-voted.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: text() });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'i-voted.png';
        a.click();
        // Later, not at once: Safari can cancel a download whose address is revoked straight away.
        const href = a.href;
        setTimeout(() => URL.revokeObjectURL(href), 10_000);
      }
    } catch (e) {
      // Closing the phone's share menu is not an error; anything else is.
      if ((e as Error)?.name !== 'AbortError') setImageFailed(true);
    }
    setBusy(false);
  }

  // Rendered at the top of the page, so the bottom bar never covers its buttons.
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <section ref={sheetRef} className="sheet" role="dialog" aria-modal="true" aria-label={t.showInk} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label={t.close}><X size={16} strokeWidth={1.75} aria-hidden /></button>
        <p className="label">{t.showInk}</p>
        <h2>{t.tellFriends}</h2>

        {/* What friends get: the image, and the exact message (so there are no surprises before sending). */}
        <div className="sheet-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={card} className={'sheet-preview' + (loaded === card ? ' is-loaded' : '')} src={card} alt={t.cardAlt} onLoad={() => setLoaded(card)} />
          <div className="sheet-side">
            <p className="label">{t.yourMessage}</p>
            <p className="sheet-message">{message} <span className="muted">{t.link}</span></p>
          </div>
        </div>
        <button type="button" className="me-row" onClick={() => setSecret((v) => !v)} aria-pressed={secret}>
          <EyeOff size={20} strokeWidth={1.75} aria-hidden />
          <span><strong>{t.keepSecret}</strong><span className="small muted">{secret ? t.secretOn : t.secretOff(last)}</span></span>
          <span className={'switch' + (secret ? ' is-on' : '')} aria-hidden />
        </button>

        <a className="btn btn-primary btn-lg sheet-main" href={`https://wa.me/?text=${encodeURIComponent(`${message} ${link()}&src=wa`)}`} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={16} strokeWidth={1.75} aria-hidden /> {t.sendWhatsApp}
        </a>
        <div className="sheet-row">
          <button type="button" className="btn btn-ghost btn-lg" onClick={shareImage} disabled={busy}>
            <Download size={15} strokeWidth={1.75} aria-hidden /> {busy ? t.makingImage : t.storyImage}
          </button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={copy}>
            {copied ? <Check size={15} strokeWidth={2} aria-hidden /> : <Link2 size={15} strokeWidth={1.75} aria-hidden />} {copied ? t.copied : t.copyLink}
          </button>
        </div>
        {imageFailed && <p className="small duel-error" role="alert">{t.imageFailed}</p>}
      </section>
    </div>,
    document.body,
  );
}
