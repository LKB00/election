import { PALETTE } from './palette';

// The Chunav mark (owner, Oct 2026: "an icon that says what the app is, the brand identity"; then "follow the app icon
// guidelines"; then "the finger looks too big for the hand, make it balanced; two colours, the ink in yellow"): a solid
// dark hand, one slim finger up from a broad closed fist (knuckles and thumb show it is a hand), with the election-ink
// line on the nail cut out in the brand yellow, centred on that yellow. Two colours only. India's sign for "I voted",
// and our signature (the inked finger after every vote). Balance: the finger is a third of the fist's width and stands
// about two thirds of the fist's height above the knuckles.
// App icon rules (Android adaptive / maskable, iPhone): a solid square, no transparency, the symbol centred inside the
// safe zone (the middle 80% circle), so every phone's crop (circle, squircle, rounded square) keeps all of it; bold
// shapes, no thin details. The finger rises from the LEFT edge of the fist (the ☝ gesture): a finger in the middle with
// fingers beside it reads as a rude gesture.
const HAND = 'M17 41.5 V19 a4.5 4.5 0 0 1 9 0 V29.5 a3.25 3.25 0 0 1 6.5 0 a3.25 3.25 0 0 1 6.5 0 a3.5 3.5 0 0 1 7 0.5 V41.5 a8 8 0 0 1 -8 8 H25 a8 8 0 0 1 -8 -8 Z';
// A folded finger and the thumb, and the ink on the nail: all cut out in the ground colour.
const FOLDS = 'M26 37 H40 M17 39.5 C 22 39.5 26 42 28 46';
const INK = 'M21.5 17 V21.5';

/** The mark as SVG markup. `rounded`: the soft square of the in-page logo; the app icon is full bleed (the phone rounds it). */
function markSvg(size: number, rounded = true): string {
  const r = rounded ? 14 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" rx="${r}" fill="${PALETTE.lime}"/><path d="${HAND}" fill="${PALETTE.ink}"/><path d="${FOLDS}" fill="none" stroke="${PALETTE.lime}" stroke-width="2.4" stroke-linecap="round"/><path d="${INK}" stroke="${PALETTE.lime}" stroke-width="3.2" stroke-linecap="round"/></svg>`;
}

/** For the image renderer (share pictures, app icon), which takes pictures as data links. */
export const markDataUri = (size: number, rounded = true) => `data:image/svg+xml;base64,${Buffer.from(markSvg(size, rounded)).toString('base64')}`;

/** The same paths, for the in-page logo (src/components/LogoMark.tsx). */
export const MARK = { HAND, FOLDS, INK };
