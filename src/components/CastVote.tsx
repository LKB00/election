'use client';
import { memo, useEffect, useRef, useState } from 'react';
import type { Dict } from '@/lib/i18n';
import { vvpatThud } from '@/lib/sound';
import { handSvg } from '@/lib/inkHand';

// The "vote cast" moment, the way it happens in a real booth (docs/DESIGN.md, "The cast-vote moment"):
// 1. EVM: your row's blue key goes down, the red light glows while it beeps.
// 2. VVPAT: the window lights up, your slip prints, stays behind the glass, then is cut and drops into the box.
// 3. Ink: a drawn hand rises; the polling officer's rod draws the ink line down from your nail; your voter ID counts up.
// One scene in the middle of the screen (it used to be three small pieces spread down the page).
// Tap anywhere to move on. Shorter after the first vote of a visit. Not shown when the phone asks for less motion.
type Props = { t: Dict; number: number; name: string; party: string | null; voterNo: number | null; short: boolean; onDone: () => void };

// The drawn hand, made once: the voter ID counting up re-renders this scene many times, and a fresh copy of the
// drawing would restart its ink animation (it never got drawn).
const HAND_HTML = { __html: handSvg('cast', 168) };
const HandArt = memo(function HandArt() {
  return <span className="cast-hand-art" dangerouslySetInnerHTML={HAND_HTML} />;
});

// When each beat starts (seconds). The CSS reads these, so the picture and the sounds stay in step.
const TIMES = {
  full: { vv: 0.5, drop: 2.3, ink: 2.75, end: 5.0 },
  short: { vv: 0.1, drop: 1.1, ink: 1.45, end: 3.3 },
};

export default function CastVote({ t, number, name, party, voterNo, short, onDone }: Props) {
  const time = short ? TIMES.short : TIMES.full;
  const [count, setCount] = useState(0);
  // The page re-renders while this plays (live numbers); keep the timers running from the first render.
  const done = useRef(onDone);
  done.current = onDone;
  const finish = () => done.current();

  useEffect(() => {
    const end = () => done.current();
    const timers = [
      setTimeout(vvpatThud, (time.drop + 0.3) * 1000), // the slip lands in the box
      setTimeout(end, time.end * 1000),
    ];
    // Voter ID counts up while the ink dries.
    let raf = 0;
    const startAt = performance.now() + (time.ink + 0.6) * 1000;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - startAt) / 700));
      setCount(Math.round((voterNo ?? 0) * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') && end();
    window.addEventListener('keydown', onKey);
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }, [time, voterNo]);

  const vars = { '--t-vv': time.vv, '--t-drop': time.drop, '--t-ink': time.ink } as React.CSSProperties;
  return (
    <div className="cast-backdrop" style={vars} onClick={finish} role="status" aria-live="polite" title={t.tapToSkip}>
      <div className="cast-stage">
        {/* Beat 1 and 2: the ballot unit and the VVPAT, side by side in a real booth; here the VVPAT sits on top. */}
        <div className="cast-booth" aria-hidden>
          <p className="label">{t.vvpat}</p>
          <div className="vv-machine">
            <div className="vv-glass">
              <span className="vv-light" />
              <span className="vv-paper">
                <span className="vv-no">{number}</span>
                <span className="vv-name">{name}</span>
                {party && <span className="vv-party">{party}</span>}
              </span>
            </div>
            <span className="vv-slot" />
          </div>
          <div className="cast-evm">
            <span className="cast-evm-no">{number}</span>
            <span className="cast-evm-name">{name}</span>
            <span className="cast-led" />
            <span className="cast-key" />
          </div>
        </div>

        {/* Beat 3: the ink. */}
        <div className="cast-ink">
          {/* The drawn hand (src/lib/inkHand.ts): the ink line is drawn on as the officer's rod moves down. */}
          <span className="cast-hand" aria-hidden>
            <HandArt />
            <span className="cast-rod" />
          </span>
          <p className="cast-text">
            <strong>{t.inked}.</strong>
            {voterNo ? <span className="muted">{t.voterId} EL-{String(count).padStart(6, '0')}</span> : null}
          </p>
        </div>

        <p className="small muted cast-skip">{t.tapToSkip}</p>
      </div>
    </div>
  );
}
