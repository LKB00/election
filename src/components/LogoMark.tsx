import { useId } from 'react';
import { MARK } from '@/lib/brandMark';

// The Chunav mark in the page (top bar, splash, big screen): the same drawing as the app icon (src/lib/brandMark.ts),
// in its own colour tokens (--mark-*), which stay the same in the dark look: a logo does not invert.
export default function LogoMark({ size = 22 }: { size?: number }) {
  const clip = useId();
  return (
    <svg className="logo-mark brand-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false">
      <defs>
        <clipPath id={clip}><rect width="64" height="64" rx="15" /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="64" height="64" fill="var(--mark-ground)" />
        <path d={MARK.HAND} fill="var(--mark-hand)" stroke="var(--mark-line)" strokeWidth="3.6" strokeLinejoin="round" />
        <path d={MARK.FOLDS} fill="none" stroke="var(--mark-line)" strokeWidth="3" strokeLinecap="round" />
        <path d={MARK.INK} stroke="var(--ink-mark)" strokeWidth="4.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
