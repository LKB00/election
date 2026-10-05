'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LANG_NAMES, LANGS, type Lang } from '@/lib/i18n';
import { setLangCookie, useLang, useT } from '@/lib/lang';
import { useOverlay } from '@/lib/useOverlay';
import Spot, { type SpotKind } from './Spot';

// First-visit onboarding (docs/DESIGN.md, "Splash and onboarding"): three short cards, only on Home for someone who has
// never voted here, never on a shared poll link (a friend's link goes straight to the vote). Swipe or tap Next; Skip is
// always there. The first card also picks the language. Seen once per phone.
const SEEN = 'election-onboarded';
const KINDS: SpotKind[] = ['invite', 'lock', 'finger'];

export default function Onboarding() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN)) return;
    } catch {
      return;
    }
    // After the splash has lifted.
    const id = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(id);
  }, []);
  const close = () => {
    try {
      localStorage.setItem(SEEN, '1');
    } catch {}
    setOpen(false);
  };
  if (!open) return null;
  return <Cards n={n} setN={setN} track={track} close={close} t={t} lang={lang} onLang={(l) => { setLangCookie(l); router.refresh(); }} />;
}

function Cards({ n, setN, track, close, t, lang, onLang }: { n: number; setN: (n: number) => void; track: React.RefObject<HTMLDivElement | null>; close: () => void; t: ReturnType<typeof useT>; lang: Lang; onLang: (l: Lang) => void }) {
  useOverlay(close, { back: true });
  const slides = t.obSlides;
  const last = n === slides.length - 1;
  const go = (k: number) => {
    const el = track.current;
    if (!el) return setN(k);
    el.scrollTo({ left: k * el.clientWidth, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const on = () => setN(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, [track, setN]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(Math.min(slides.length - 1, n + 1));
      if (e.key === 'ArrowLeft') go(Math.max(0, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="onb" role="dialog" aria-modal="true" aria-label={t.obLabel}>
      <button type="button" className="onb-skip" onClick={close}>{t.obSkip} <X size={16} strokeWidth={2} aria-hidden /></button>
      <div className="onb-track" ref={track}>
        {slides.map(([title, line], k) => (
          <section key={k} className="onb-card" aria-roledescription="slide" aria-label={t.obStep(k + 1, slides.length)} aria-hidden={k !== n}>
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
