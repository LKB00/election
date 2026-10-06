import { PALETTE } from './palette';

// The Chunav mark (owner, Oct 2026: "an icon that says what the app is, the brand identity"): one finger up from a closed
// fist with the purple election ink on the nail, on the brand yellow. India's sign for "I voted", and our signature (the
// inked finger after every vote). One drawing for the app icon, the browser tab, the top bar, the splash and the share
// pictures. The finger rises from the left edge of the fist (the ☝ gesture), never from the middle.
const HAND = 'M14 70 V44 a8 8 0 0 1 4 -6.9 V16 a7.5 7.5 0 0 1 15 0 V32 h9 a9 9 0 0 1 9 9 V70 Z';
const FOLDS = 'M33 42 H45 M33 51 H47';
const INK = 'M25.5 11.5 V24';

/** The mark as SVG markup. `rounded`: the soft square of the logo; the app icon is full-bleed (the phone rounds it). */
export function markSvg(size: number, rounded = true): string {
  const r = rounded ? 15 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><defs><clipPath id="m"><rect width="64" height="64" rx="${r}"/></clipPath></defs><g clip-path="url(#m)"><rect width="64" height="64" fill="${PALETTE.lime}"/><path d="${HAND}" fill="${PALETTE.paper}" stroke="${PALETTE.ink}" stroke-width="3.6" stroke-linejoin="round"/><path d="${FOLDS}" fill="none" stroke="${PALETTE.ink}" stroke-width="3" stroke-linecap="round"/><path d="${INK}" stroke="${PALETTE.inkMark}" stroke-width="4.4" stroke-linecap="round"/></g></svg>`;
}

/** For the image renderer (share pictures, app icon), which takes pictures as data links. */
export const markDataUri = (size: number, rounded = true) => `data:image/svg+xml;base64,${Buffer.from(markSvg(size, rounded)).toString('base64')}`;

/** The same paths, for the in-page logo (src/components/LogoMark.tsx). */
export const MARK = { HAND, FOLDS, INK };
