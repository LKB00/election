import { PALETTE } from './palette';

// The inked index finger, drawn (owner: "create one, don't use photos", then a flat reference picture: "something like this").
// Flat style: one smooth outline for the whole hand (owner: the boxy first try "looks weird"), light skin in a few flat
// tones, no outlines; a raised index finger, nail towards you, the other fingers folded as rounded humps, and a wavy purple ink mark on the nail, as the polling officer draws it. Our own drawing (not traced).
// One drawing for the app, the vote moment and the share images.
// The ink is one path (class "hand-ink", length 1), so the vote moment can draw it on (see .cast-hand in election.css).
// The drawing has no ids today; the prefix p is kept so ids can be added safely later.
const HAND_RATIO = 260 / 200;

export function handSvg(p = 'h', w = 200): string {
  const h = Math.round(w * HAND_RATIO);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260" width="${w}" height="${h}">
  <path d="M54 112 L54 24 C54 15 60 9 67.6 9 C75 9 81.3 15 81.3 24 L81.3 84 C82.5 80 88 76.5 95 76.5 C102 76.5 107.5 80 108.6 87.5 C111 84.5 116 84 121 84.5 C127 85.5 131 90 131.6 99.5 C134 97 138 96.5 142 97.5 C147 99 150 103 151.5 110 C155 119 157.5 129 158 141 L157 171 C155 192 151 210 147 224 L145.6 260 L71.4 260 L69.7 224 C60 205 48 182 41 162 C39 152 40 140 46.6 125 C49 119 52 115 54 112 Z" fill="#f6c19c"/>
  <path d="M41 162 C48 182 60 205 69.7 224 L71.4 260 L74.4 260 L73.4 225 C64 205 53 184 46.5 164 C44.5 156 44.5 146 47.5 136 C43 145 40 154 41 162 Z" fill="#efb088"/>
  <path d="M158 141 L157 171 C155 192 151 210 147 224 L145.6 260 L142.6 260 L143.4 223 C148 208 152 190 153 170 L153.5 142 C153 132 151.5 122 150 114 C153.5 122 156.5 131 158 141 Z" fill="#efb088"/>
  <path d="M102.5 78.5 C105.5 80.5 108 83.5 108.6 87.5 L107.6 112 C106.4 100 105 89 102.5 78.5 Z M125.5 86 C128.5 88 131 92 131.6 99.5 L130.6 122 C129.6 110 128 96 125.5 86 Z M146.5 100.5 C149 103 150.6 106 151.5 110 C155 119 157.5 129 158 141 L157.4 150 C155.8 134 152 116 146.5 100.5 Z" fill="#efb088"/>
  <path d="M108.6 87.5 C107.8 101 107.2 114 105.8 128 M131.6 99.5 C130.9 112 130.2 124 128.8 134" fill="none" stroke="#e7a37c" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M95 138 C96.5 154 97 170 96 186 M119 142 C120.5 158 120.5 172 119 186" fill="none" stroke="#efb590" stroke-width="3.5" stroke-linecap="round" opacity="0.6"/>
  <path d="M41.5 158 Q45.5 160.5 49.5 159.5" fill="none" stroke="#e7a37c" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M77 14 C80 17 81.3 20 81.3 26 L81.3 84 C80 66 79 40 77 14 Z" fill="#efb088"/>
  <path d="M61 68 Q67.6 70.5 74 68 M62 73.5 Q67.6 75.5 73 73.5" fill="none" stroke="#e7a37c" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M63 42 Q67.6 43.5 72 42" fill="none" stroke="#e7a37c" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M59.5 22 C59.5 15 63 11.5 67.6 11.5 C72.2 11.5 75.7 15 75.7 22 L75.7 32.5 C75.7 35 73.8 36.5 71.5 36.5 L63.7 36.5 C61.4 36.5 59.5 35 59.5 32.5 Z" fill="#fbe2d6"/>
  <path d="M60 31 Q67.6 27.5 75.2 31 L75.2 32.5 C75.2 34.6 73.6 36 71.5 36 L63.7 36 C61.6 36 60 34.6 60 32.5 Z" fill="#fff6f1"/>
  <path class="hand-ink" pathLength="1" d="M68.5 15 C66.5 19 70 23 68 27 C66.5 31 69.5 35 68 41" fill="none" stroke="${PALETTE.inkMark}" stroke-width="4.6" stroke-linecap="round"/>
</svg>`;
}

/** For the share images (the image renderer takes pictures as data links). */
export const handDataUri = (w = 200) => `data:image/svg+xml;base64,${Buffer.from(handSvg('og', w)).toString('base64')}`;
