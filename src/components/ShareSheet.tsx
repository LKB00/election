'use client';
import { Check, Download, EyeOff, Link2, MessageCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PollOption, PollView } from '@/lib/polls';

// "Show your ink": the moment after voting when people share. Built for the least drop-off:
// WhatsApp first (one tap, message already written), the secret ballot on by default
// (curiosity: "Guess who I picked?"), a story image with a small QR for Status/Instagram,
// where links cannot be tapped. See docs/DESIGN.md (Sharing).
export default function ShareSheet({ poll, pick, shareCode, onClose }: { poll: PollView; pick: PollOption; shareCode: string; onClose: () => void }) {
  const [secret, setSecret] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const last = pick.label.trim().split(/\s+/).pop();
  const link = () => `${window.location.origin}/p/${poll.id}?f=${shareCode}${secret ? '&s=1' : ''}`;
  const card = `/api/card/${poll.id}?f=${shareCode}${secret ? '&s=1' : ''}`;
  const message = secret
    ? `I just voted in “${poll.title}” 🗳️☝️ Guess who I picked? Vote and find out:`
    : `I voted for ${last} in “${poll.title}” 🗳️☝️ Who would you pick?`;
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
      window.prompt('Copy this link', link());
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
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Show your ink" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label="Close"><X size={16} strokeWidth={1.75} aria-hidden /></button>
        <p className="label">Show your ink</p>
        <h2>Tell friends you voted</h2>

        {/* What friends get: the image, and the exact message (so there are no surprises before sending). */}
        <div className="sheet-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sheet-preview" src={card} alt="Your I voted card" />
          <div className="sheet-side">
            <p className="label">Your message</p>
            <p className="sheet-message">{message} <span className="muted">link</span></p>
          </div>
        </div>
        <button type="button" className="me-row" onClick={() => setSecret((v) => !v)} aria-pressed={secret}>
          <EyeOff size={20} strokeWidth={1.75} aria-hidden />
          <span><strong>Keep my vote secret</strong><span className="small muted">{secret ? 'Friends must vote to see your pick. More of them vote.' : `Shows you picked ${last}. Good to start a debate.`}</span></span>
          <span className={'switch' + (secret ? ' is-on' : '')} aria-hidden />
        </button>

        <a className="btn btn-primary btn-lg sheet-main" href={`https://wa.me/?text=${encodeURIComponent(text())}`} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={16} strokeWidth={1.75} aria-hidden /> Send on WhatsApp
        </a>
        <div className="sheet-row">
          <button type="button" className="btn btn-ghost btn-lg" onClick={shareImage} disabled={busy}>
            <Download size={15} strokeWidth={1.75} aria-hidden /> {busy ? 'Making image…' : 'Status / Story image'}
          </button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={copy}>
            {copied ? <Check size={15} strokeWidth={2} aria-hidden /> : <Link2 size={15} strokeWidth={1.75} aria-hidden />} {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </section>
    </div>
  );
}
