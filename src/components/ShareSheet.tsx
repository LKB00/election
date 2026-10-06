'use client';
import { Check, Download, EyeOff, Link2, Share2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '@/lib/useOverlay';
import type { PollOption, PollView } from '@/lib/polls';
import { useLang, useT } from '@/lib/lang';
import { track } from '@/lib/track';
import { MAX_CARD_NAME } from '@/lib/limits';
import { FacebookIcon, TelegramIcon, WhatsAppIcon, XIcon } from './AppIcons';

// "Show your ink": the moment after voting when people share. One Share button opens the phone's own share menu with
// the picture and the message together (Instagram, X, WhatsApp, Telegram… whatever the person uses), then quick buttons
// for the common apps. The secret ballot is on by default (curiosity: "Guess who I picked?"). The message comes in three
// styles and can be edited; an optional name makes the picture personal ("Lokesh voted"). See docs/DESIGN.md (Sharing).
type Tone = 'dare' | 'ask' | 'short';
const NAME_KEY = 'chunav-card-name';
export default function ShareSheet({ poll, pick, shareCode, onClose }: { poll: PollView; pick: PollOption; shareCode: string; onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const hi = lang === 'en' ? '' : `&l=${lang}`;
  const [secret, setSecret] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  // The card image is made on the server; it floats in once it has loaded (grey placeholder until then).
  const [loaded, setLoaded] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>('dare');
  // What the person typed over the suggested message (null = use the suggestion).
  const [edited, setEdited] = useState<string | null>(null);
  // The name on the picture: typed once, remembered on this phone only (never sent with the vote).
  const [nameDraft, setNameDraft] = useState('');
  const [name, setName] = useState('');
  useEffect(() => {
    try {
      const n = localStorage.getItem(NAME_KEY) ?? '';
      setNameDraft(n);
      setName(n);
    } catch {}
  }, []);
  const commitName = () => {
    const n = nameDraft.trim().slice(0, MAX_CARD_NAME);
    setName(n);
    try {
      if (n) localStorage.setItem(NAME_KEY, n);
      else localStorage.removeItem(NAME_KEY);
    } catch {}
  };

  // Full name: a last name alone can be ambiguous ("Gandhi").
  const last = pick.label;
  // An open link carries the proof (o=) that lets its preview show your pick; a secret one has none, so editing the
  // address cannot reveal it.
  const mode = secret || !poll.myShareProof ? '&s=1' : `&o=${poll.myShareProof}`;
  const link = () => `${window.location.origin}/p/${poll.id}?f=${shareCode}${mode}${hi}`;
  const card = `/api/card/${poll.id}?f=${shareCode}${mode}${hi}${name ? `&n=${encodeURIComponent(name)}` : ''}`;
  // Wordle lesson: a short, spoiler-free line anyone can read in a chat (and your exit poll result, if you made one).
  const mark = poll.myGuess ? ` · ${t.exitMark(poll.myGuess.correct)}` : '';
  const suggested =
    tone === 'dare' ? (secret ? t.msgDare(poll.title, mark) : t.msgDareOpen(poll.title, last, mark))
    : tone === 'ask' ? (secret ? t.msgAsk(poll.title) : t.msgAskOpen(poll.title, last))
    : secret ? t.msgShort(poll.title) : t.msgShortOpen(poll.title, last);
  const message = edited ?? suggested;
  const text = (src?: string) => `${message} ${link()}${src ? `&src=${src}` : ''}`;

  // Phones: the page behind stays still, and the Back button closes the sheet (not the page).
  useOverlay(onClose, { back: true });

  // Like any sheet: Escape closes it, focus moves into it, Tab stays inside, and focus goes back to the Share button after.
  const sheetRef = useRef<HTMLElement>(null);
  useEffect(() => track('share_open'), []);
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
    track('copy_link');
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

  async function imageBlob() {
    if (image?.url === card) return image.blob;
    const res = await fetch(card);
    if (!res.ok) throw new Error(String(res.status));
    return res.blob();
  }
  // The main button: the phone's own share menu with the picture and the message together, so it goes to any app
  // (Instagram, X, WhatsApp, Telegram…). Without that menu (most computers) the quick buttons below do the job.
  const [noMenu, setNoMenu] = useState(false);
  async function shareAll() {
    setBusy(true);
    setImageFailed(false);
    try {
      const file = new File([await imageBlob()], 'i-voted.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: text('other') });
      else if (navigator.share) await navigator.share({ text: text('other') });
      else setNoMenu(true);
    } catch (e) {
      // Closing the phone's share menu is not an error; anything else is.
      if ((e as Error)?.name !== 'AbortError') {
        if (navigator.share) {
          try {
            await navigator.share({ text: text('other') });
          } catch {}
        } else setNoMenu(true);
      }
    }
    setBusy(false);
  }
  // Save the picture (for an Instagram story or Status from a computer, or to post later).
  async function saveImage() {
    setBusy(true);
    setImageFailed(false);
    try {
      const blob = await imageBlob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'i-voted.png';
      a.click();
      // Later, not at once: Safari can cancel a download whose address is revoked straight away.
      const href = a.href;
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch {
      setImageFailed(true);
    }
    setBusy(false);
  }
  const apps = [
    { k: 'wa', name: 'WhatsApp', Icon: WhatsAppIcon, href: () => `https://wa.me/?text=${encodeURIComponent(text('wa'))}`, onClick: () => track('whatsapp') },
    { k: 'x', name: 'X', Icon: XIcon, href: () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(`${link()}&src=x`)}` },
    { k: 'fb', name: 'Facebook', Icon: FacebookIcon, href: () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${link()}&src=fb`)}` },
    { k: 'tg', name: 'Telegram', Icon: TelegramIcon, href: () => `https://t.me/share/url?url=${encodeURIComponent(`${link()}&src=tg`)}&text=${encodeURIComponent(message)}` },
  ];

  // Rendered at the top of the page, so the bottom bar never covers its buttons.
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <section ref={sheetRef} className="sheet" role="dialog" aria-modal="true" aria-label={t.showInk} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label={t.close}><X size={16} strokeWidth={1.75} aria-hidden /></button>
        <p className="label">{t.showInk}</p>
        <h2>{t.tellFriends}</h2>

        {/* What friends get: the picture (with your name on it if you like) and the message, both editable here. */}
        <div className="sheet-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={card} className={'sheet-preview' + (loaded === card ? ' is-loaded' : '')} src={card} alt={t.cardAlt} onLoad={() => setLoaded(card)} />
          <div className="sheet-side">
            <label className="label" htmlFor="card-name">{t.cardNameLabel}</label>
            <input id="card-name" className="input sheet-name" value={nameDraft} maxLength={MAX_CARD_NAME} placeholder={t.cardNamePh} autoComplete="given-name" enterKeyHint="done"
              onChange={(e) => setNameDraft(e.target.value)} onBlur={commitName} onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())} />
          </div>
        </div>

        <div className="sheet-msg">
          <div className="sheet-tones" role="radiogroup" aria-label={t.yourMessage}>
            {(['dare', 'ask', 'short'] as Tone[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={tone === k} className={'chip' + (tone === k ? ' chip-on' : '')} onClick={() => { setTone(k); setEdited(null); }}>
                {k === 'dare' ? t.toneDare : k === 'ask' ? t.toneAsk : t.toneShort}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="share-msg">{t.msgEdit}</label>
          <textarea id="share-msg" className="sheet-message sheet-edit" rows={4} value={message} onChange={(e) => setEdited(e.target.value)} />
        </div>

        <button type="button" className="me-row" onClick={() => { setSecret((v) => !v); setEdited(null); }} aria-pressed={secret}>
          <EyeOff size={20} strokeWidth={1.75} aria-hidden />
          <span><strong>{t.keepSecret}</strong><span className="small muted">{secret ? t.secretOn : t.secretOff(last)}</span></span>
          <span className={'switch' + (secret ? ' is-on' : '')} aria-hidden />
        </button>

        {/* One main action: the phone's own share menu (any app), with the picture and the message. */}
        <button type="button" className="btn btn-primary btn-lg sheet-main" onClick={shareAll} disabled={busy}>
          <Share2 size={16} strokeWidth={1.75} aria-hidden /> {busy ? t.makingImage : t.shareNow}
        </button>
        <p className={'label sheet-or' + (noMenu ? ' is-hint' : '')}>{t.shareOr}</p>
        <div className="sheet-apps">
          {apps.map(({ k, name, Icon, href, onClick }) => (
            <a key={k} className="sheet-app" href={href()} target="_blank" rel="noopener noreferrer" onClick={onClick}>
              <span className="sheet-app__disc"><Icon /></span>
              <span className="sheet-app__name">{name}</span>
            </a>
          ))}
          <button type="button" className="sheet-app" onClick={saveImage} disabled={busy}>
            <span className="sheet-app__disc"><Download size={20} strokeWidth={1.75} aria-hidden /></span>
            <span className="sheet-app__name">{t.saveImage}</span>
          </button>
          <button type="button" className="sheet-app" onClick={copy}>
            <span className="sheet-app__disc">{copied ? <Check size={20} strokeWidth={2} aria-hidden /> : <Link2 size={20} strokeWidth={1.75} aria-hidden />}</span>
            <span className="sheet-app__name">{copied ? t.copied : t.copyLink}</span>
          </button>
        </div>
        {imageFailed && <p className="small duel-error" role="alert">{t.imageFailed}</p>}
      </section>
    </div>,
    document.body,
  );
}
