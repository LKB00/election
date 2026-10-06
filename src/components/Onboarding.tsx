'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LANG_NAMES, LANGS, type Lang } from '@/lib/i18n';
import { setLangCookie, useLang, useT } from '@/lib/lang';
import { useOverlay } from '@/lib/useOverlay';
import { ONB_READY, ONBOARD_VERSION, SEEN } from '@/lib/onboard';
import Spot, { type SpotKind } from './Spot';

// First-visit onboarding (docs/DESIGN.md, "Splash and onboarding"): three short cards, only on Home for someone who has
// never voted here, never on a shared poll link (a friend's link goes straight to the vote). Swipe or tap Next; Skip is
// always there. The first card also picks the language. Seen once per phone.
// It opens at once, under the splash (the splash waits for it, then fades straight into it), so Home never flashes
// first. Cards change with a soft cross-fade: the new one's picture, title and line rise in one after another, drifting
// a little from the side you are going to (owner, Oct 2026: the old sideways scroll was not smooth).
// Bump ONBOARD_VERSION to show the cards (and the Home splash) once more to every phone, voters included: the owner's
// "start from onboarding in the next release". Splash.tsx reads the same key and version before the page paints
// (both live in src/lib/onboard.ts).
const KINDS: SpotKind[] = ['invite', 'lock', 'finger'];
/** How far a finger must move sideways to change card (px). */
const SWIPE_PX = 40;

export default function Onboarding() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Opened under the splash: it must never fade in by itself (see the comment in the effect).
  const [under, setUnder] = useState(false);
  const [n, setN] = useState(0);
  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN) === ONBOARD_VERSION) return;
    } catch {
      return;
    }
    // Under the splash, the cards are already fully there when it lifts, so they get no fade-in of their own. (The old
    // rule switched the fade off only while the splash was on; when the splash ended the fade switched back on and
    // restarted from invisible, so Home showed through for a moment: the owner's "it shows the home page in between".)
    setUnder(document.documentElement.classList.contains('splash-on'));
    setOpen(true);
  }, []);
  const close = () => {
    try {
      localStorage.setItem(SEEN, ONBOARD_VERSION);
    } catch {}
    setOpen(false);
  };
  if (!open) return null;
  return <Cards under={under} n={n} setN={setN} close={close} t={t} lang={lang} onLang={(l) => { setLangCookie(l); router.refresh(); }} />;
}

function Cards({ under, n, setN, close, t, lang, onLang }: { under: boolean; n: number; setN: (n: number) => void; close: () => void; t: ReturnType<typeof useT>; lang: Lang; onLang: (l: Lang) => void }) {
  useOverlay(close, { back: true });
  const slides = t.obSlides;
  const last = n === slides.length - 1;
  // Which way we are going (1 forward, -1 back): the new card drifts in from that side.
  const [dir, setDir] = useState(1);
  const go = (k: number) => {
    if (k < 0 || k >= slides.length || k === n) return;
    setDir(k > n ? 1 : -1);
    setN(k);
  };
  // On screen: tell the splash it can fade into us; take the mark off when the cards close.
  useEffect(() => {
    const d = document.documentElement;
    d.dataset.onb = ONB_READY;
    return () => {
      delete d.dataset.onb;
    };
  }, []);
  // A sideways swipe (more across than down, at least SWIPE_PX) moves one card.
  const start = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => (start.current = { x: e.clientX, y: e.clientY });
  const onUp = (e: React.PointerEvent) => {
    const s0 = start.current;
    start.current = null;
    if (!s0) return;
    const dx = e.clientX - s0.x;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(e.clientY - s0.y)) return;
    go(dx < 0 ? n + 1 : n - 1);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(n + 1);
      if (e.key === 'ArrowLeft') go(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className={'onb' + (under ? ' is-under' : '')} role="dialog" aria-modal="true" aria-label={t.obLabel}>
      <button type="button" className="onb-skip" onClick={close}>{t.obSkip} <X size={16} strokeWidth={2} aria-hidden /></button>
      <div className="onb-track" style={{ '--dx': dir } as React.CSSProperties} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (start.current = null)}>
        {slides.map(([title, line], k) => (
          <section key={k} className={'onb-card' + (k === n ? ' is-on' : '')} aria-roledescription="slide" aria-label={t.obStep(k + 1, slides.length)} aria-hidden={k !== n}>
            <Spot kind={KINDS[k]} size={220} />
            <h2 className="onb-title">{title}</h2>
            <p className="onb-line">{line}</p>
            {k === 0 && (
              <div className="onb-langs" role="radiogroup" aria-label={t.language}>
                {LANGS.map((l) => (
                  <button key={l} type="button" role="radio" aria-checked={l === lang} lang={l === 'hi' ? 'hi' : 'en'} className={'chip' + (l === lang ? ' chip-on' : '')} onClick={() => onLang(l)} tabIndex={k === n ? 0 : -1}>
                    {LANG_NAMES[l]}
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
      <div className="onb-foot">
        <div className="onb-dots" aria-hidden>
          {slides.map((_, k) => <span key={k} className={k === n ? 'is-on' : ''} />)}
        </div>
        {last ? (
          <>
            <button type="button" className="btn btn-primary btn-lg onb-go" onClick={close}>{t.obStart}</button>
            <Link href="/create" className="text-link onb-alt" onClick={close}>{t.obStartPoll}</Link>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary btn-lg onb-go" onClick={() => go(n + 1)}>{t.obNext}</button>
            <span className="text-link onb-alt is-hidden" aria-hidden>{t.obStartPoll}</span>
          </>
        )}
      </div>
    </div>
  );
}
