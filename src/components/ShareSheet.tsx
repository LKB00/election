'use client';
import { Check, Download, EyeOff, Link2, MessageCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PollOption, PollView } from '@/lib/polls';
import { useLang, useT } from '@/lib/lang';

// "Show your ink": the moment after voting when people share. Built for the least drop-off:
// WhatsApp first (one tap, message already written), the secret ballot on by default
// (curiosity: "Guess who I picked?"), a story image with a small QR for Status/Instagram,
// where links cannot be tapped. See docs/DESIGN.md (Sharing).
export default function ShareSheet({ poll, pick, shareCode, onClose }: { poll: PollView; pick: PollOption; shareCode: string; onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const hi = lang === 'hi' ? '&l=hi' : '';
  const [secret, setSecret] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  // Full name: a last name alone can be ambiguous ("Gandhi").
  const last = pick.label;
  const link = () => `${window.location.origin}/p/${poll.id}?f=${shareCode}${secret ? '&s=1' : ''}${hi}`;
  const card = `/api/card/${poll.id}?f=${shareCode}${secret ? '&s=1' : ''}${hi}`;
  // Wordle lesson: a short, spoiler-free line anyone can read in a chat (and your exit poll result, if you made one).
  const mark = poll.myGuess ? ` · ${t.exitMark(poll.myGuess.correct)}` : '';
  const message = secret ? t.msgSecret(poll.title, mark) : t.msgOpen(poll.title, last, mark);
  const text = () => `${message} ${link()}`;

  // Close with Escape, like any sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
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

  // Phones: share the image and the message together (Status, Instagram). Otherwise: download the image.
  async function shareImage() {
    setBusy(true);
    try {
      const blob = await (await fetch(card)).blob();
      const file = new File([blob], 'i-voted.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: text() });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'i-voted.png';
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      /* closed the share sheet */
    }
    setBusy(false);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label={t.showInk} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label={t.close}><X size={16} strokeWidth={1.75} aria-hidden /></button>
        <p className="label">{t.showInk}</p>
        <h2>{t.tellFriends}</h2>

        {/* What friends get: the image, and the exact message (so there are no surprises before sending). */}
        <div className="sheet-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sheet-preview" src={card} alt={t.cardAlt} />
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

        <a className="btn btn-primary btn-lg sheet-main" href={`https://wa.me/?text=${encodeURIComponent(text())}`} target="_blank" rel="noopener noreferrer">
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
      </section>
    </div>
  );
}
