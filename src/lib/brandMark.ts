import { PALETTE } from './palette';

// The Chunav mark (owner, Oct 2026: "an icon that says what the app is, the brand identity"; then "follow the app icon
// guidelines, and light grey instead of purple"): a solid dark hand, one finger up from a closed fist (knuckles and thumb
// show it is a hand), with a light grey election-ink line on the nail, centred on the brand yellow. India's sign for
// "I voted", and our signature (the inked finger after every vote).
// App icon rules (Android adaptive / maskable, iPhone): a solid square, no transparency, the symbol centred inside the
// safe zone (the middle 80% circle), so every phone's crop (circle, squircle, rounded square) keeps all of it; bold
// shapes, no thin details. The finger rises from the LEFT edge of the fist (the ☝ gesture): a finger in the middle with
// fingers beside it reads as a rude gesture.
const HAND = 'M18.5 44 V17 a6 6 0 0 1 12 0 V30.5 a4 4 0 0 1 7 -1.2 a4 4 0 0 1 7.5 2.7 V44 a9 9 0 0 1 -9 9 H27.5 a9 9 0 0 1 -9 -9 Z';
// A folded finger and the thumb, cut out in the ground colour.
const FOLDS = 'M31.5 38.5 H40 M18.5 41.5 C 24 41.5 28.5 44 31 48';
const INK = 'M24.5 14.8 V22.5';

/** The mark as SVG markup. `rounded`: the soft square of the in-page logo; the app icon is full bleed (the phone rounds it). */
export function markSvg(size: number, rounded = true): string {
  const r = rounded ? 14 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" rx="${r}" fill="${PALETTE.lime}"/><path d="${HAND}" fill="${PALETTE.ink}"/><path d="${FOLDS}" fill="none" stroke="${PALETTE.lime}" stroke-width="2.6" stroke-linecap="round"/><path d="${INK}" stroke="${PALETTE.markInk}" stroke-width="3.6" stroke-linecap="round"/></svg>`;
}

/** For the image renderer (share pictures, app icon), which takes pictures as data links. */
export const markDataUri = (size: number, rounded = true) => `data:image/svg+xml;base64,${Buffer.from(markSvg(size, rounded)).toString('base64')}`;

/** The same paths, for the in-page logo (src/components/LogoMark.tsx). */
export const MARK = { HAND, FOLDS, INK };
