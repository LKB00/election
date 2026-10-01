'use client';
import { useEffect, useRef, useState } from 'react';

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smoothly counts a number up (or down) to its new value. */
export function useCountUp(target: number, ms = 900): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reducedMotion() || from.current === target) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const begin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = begin + (target - begin) * eased;
      from.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

/** A small burst of confetti from a point on the screen. */
export function confetti(x: number, y: number, colors: string[]) {
  if (reducedMotion() || typeof document === 'undefined') return;
  for (let i = 0; i < 36; i++) {
    const el = document.createElement('span');
    const size = 6 + Math.random() * 6;
    Object.assign(el.style, {
      position: 'fixed', left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size * 0.6}px`,
      background: colors[i % colors.length], borderRadius: '2px', pointerEvents: 'none', zIndex: '100',
    });
    document.body.appendChild(el);
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 190;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 80;
    const anim = el.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${dx * 1.1}px, ${dy + 160}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' },
    );
    anim.onfinish = () => el.remove();
  }
}
