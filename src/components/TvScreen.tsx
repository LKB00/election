'use client';
import { Maximize2, Minimize2 } from 'lucide-react';
import LogoMark from './LogoMark';
import { useEffect, useState } from 'react';
import { faceLabels } from '@/lib/labels';
import { useLang, useT } from '@/lib/lang';
import { sharesAddUp, wholePercents } from '@/lib/percent';
import type { PollView } from '@/lib/polls';
import { ratingAverage, ratingEmoji } from '@/lib/rating';
import { INDIA_TZ, dateLocale, monthStyle } from '@/lib/time';

const TONES = ['input', 'feedback', 'control', 'agents', 'output', 'trust'];
/** How often the screen asks for the latest count (seconds). Paused while the tab is hidden. */
const REFRESH_SECONDS = 4;

// The big screen: the question large enough to read across a room (P1), the live bars or the plain choices (P1), and a
// QR code with the short link to vote from a phone (P2). One quiet Full screen button (P3), hidden in full screen.
export default function TvScreen({ initial, qr, link }: { initial: PollView; qr: string; link: string }) {
  const t = useT();
  const lang = useLang();
  const [poll, setPoll] = useState(initial);
  const [full, setFull] = useState(false);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      const next = await fetch(`/api/polls/${initial.id}?public=1`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!stop && next?.id) setPoll(next);
    };
    const timer = setInterval(tick, REFRESH_SECONDS * 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [initial.id]);

  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  // iPhone has no full screen for pages: the button is hidden there (it used to do nothing).
  const [canFull, setCanFull] = useState(false);
  useEffect(() => setCanFull(!!document.fullscreenEnabled), []);
  const toggleFull = () => {
    const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
    p?.catch(() => undefined);
  };

  const shown = poll.resultsVisible && poll.totalVotes > 0;
  const pcts = sharesAddUp(poll.kind) ? wholePercents(poll.options.map((o) => o.percent)) : poll.options.map((o) => Math.round(o.percent));
  const top = Math.max(0, ...pcts);
  const leader = shown && pcts.filter((p) => p === top).length === 1 ? pcts.indexOf(top) : -1;
  const letters = poll.kind === 'dates' ? poll.options.map((o) => /\d{1,2}/.exec(o.label)?.[0] ?? '📅') : faceLabels(poll.options.map((o) => o.label));
  const avg = poll.kind === 'rating' && shown ? ratingAverage(poll.options.map((o) => o.votes)) : null;
  const when = (iso: string) => new Date(iso).toLocaleString(dateLocale(lang), { day: 'numeric', month: monthStyle(lang), hour: 'numeric', minute: '2-digit', timeZone: INDIA_TZ });
  const note = poll.groupWaiting && poll.groupSize ? t.tvGroup(poll.participants, poll.groupSize)
    : poll.revealAt ? t.meReveal(when(poll.revealAt))
    : poll.sealedUntil ? t.sealed(when(poll.sealedUntil))
    : !poll.resultsVisible ? t.tvHidden
    : '';

  return (
    <div className={'tv' + (poll.closed ? ' is-closed' : '')}>
      <header className="tv-top">
        <p className="tv-brand"><LogoMark size={40} /> {t.siteName}</p>
        <p className="tv-state">
          {poll.closed ? <strong>{poll.electionMode ? t.declaredTitle : t.finalTitle}</strong> : <><span className="live-dot" aria-hidden /> {t.tvLive}</>}
          <span className="tv-count"> · {t.votes(poll.participants)}</span>
        </p>
        {!full && canFull && (
          <button type="button" className="btn btn-ghost tv-full" onClick={toggleFull}>
            <Maximize2 size={16} strokeWidth={2} aria-hidden /> {t.tvFull}
          </button>
        )}
        {full && (
          <button type="button" className="icon-btn tv-full" onClick={toggleFull} aria-label={t.tvExit}>
            <Minimize2 size={18} strokeWidth={2} aria-hidden />
          </button>
        )}
      </header>

      <main className="tv-main">
        <section className="tv-poll" aria-live="polite">
          <h1 className="tv-q">{poll.title}</h1>
          {avg != null && <p className="tv-avg"><span aria-hidden>{ratingEmoji(avg)}</span> {t.rateAvg(avg.toFixed(1))}</p>}
          <ol className="tv-options">
            {poll.options.map((o, n) => (
              <li key={o.id} className={'tv-option' + (shown ? '' : ' is-plain') + (n === leader ? ' is-lead' : '')} style={{ '--tone': `var(--p-${TONES[n % TONES.length]})` } as React.CSSProperties}>
                <span className="tv-face" aria-hidden>{o.emoji ?? letters[n]}</span>
                <span className="tv-label">{o.isOther ? t.otherChoice : poll.kind === 'rating' ? t.rateWords[n] ?? o.label : o.label}</span>
                {shown && <span className="tv-pct">{pcts[n]}%</span>}
                {shown && <span className="tv-meter" aria-hidden><span style={{ width: `${pcts[n]}%` }} /></span>}
              </li>
            ))}
          </ol>
          {note && <p className="tv-note">{note}</p>}
        </section>

        <aside className="tv-scan">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="" width={240} height={240} />
          <div className="tv-scan-text">
            <p className="tv-scan-title">{poll.closed ? t.tvScanResult : t.tvScan}</p>
            <p className="tv-link">{t.tvOr} <strong>{link}</strong></p>
          </div>
        </aside>
      </main>
    </div>
  );
}
