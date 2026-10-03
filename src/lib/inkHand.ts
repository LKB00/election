// The inked index finger, drawn (owner: "create one, don't use photos", then a flat reference picture: "something like this").
// Flat style: light skin in a few flat tones, no outlines; a raised index finger, nail towards you, the other fingers
// folded, and a wavy purple ink mark on the nail, as the polling officer draws it. Our own drawing (not traced).
// One drawing for the app, the vote moment and the share images.
// The ink is one path (class "hand-ink", length 1), so the vote moment can draw it on (see .cast-hand in election.css).
// The drawing has no ids today; the prefix p is kept so ids can be added safely later.
export const HAND_RATIO = 260 / 200;

export function handSvg(p = 'h', w = 200): string {
  const h = Math.round(w * HAND_RATIO);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260" width="${w}" height="${h}">
  <path d="M88 124 L88 74 C88 66 93 61 100 61 C107 61 112 66 112 74 L112 124 Z" fill="#efb995"/>
  <path d="M110 128 L110 80 C110 72 115 67 122 67 C129 67 134 72 134 80 L134 128 Z" fill="#ecb48f"/>
  <path d="M132 134 L132 96 C132 89 136 84 142 84 C148 84 152 89 152 96 L152 134 Z" fill="#e9b08a"/>
  <path d="M66 112 C58 114 52 122 51 132 C50 146 54 158 60 170 C66 182 74 192 80 200 L82 260 L142 260 L143 214 C152 202 158 186 158 166 L157 124 C157 116 151 110 143 110 L76 110 C72 110 69 111 66 112 Z" fill="#f4c3a0"/>
  <path d="M51 132 C50 146 54 158 60 170 C66 182 74 192 80 200 L81 216 C73 206 63 194 57 182 C51 168 49 150 51 132 Z" fill="#ebb08b"/>
  <path d="M143 214 C152 202 158 186 158 166 L157 124 C157 120 155 116 152 114 L152 166 C152 186 147 200 142 210 Z" fill="#ebb08b"/>
  <path d="M100 128 C102 150 104 170 103 190 M118 132 C120 152 121 170 119 188 M136 138 C137 156 137 172 134 186" fill="none" stroke="#ecb592" stroke-width="4" stroke-linecap="round" opacity="0.45"/>
  <path d="M56.5 133 C56.5 140 59 145 63 148" fill="none" stroke="#e5a983" stroke-width="2" stroke-linecap="round"/>
  <path d="M66 150 L66 26 C66 17 71 11 78 11 C85 11 90 17 90 26 L90 118 C90 130 86 142 78 152 Z" fill="#f4c3a0"/>
  <path d="M85 20 C88 24 90 28 90 34 L90 112 C88 108 86 106 85 106 Z" fill="#eebb98"/>
  <path d="M71 84 Q78 86 85 84 M72 89 Q78 91 84 89" fill="none" stroke="#e7ac87" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M73 48 Q78 49.5 83 48" fill="none" stroke="#e7ac87" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M70.5 26 C70.5 18 74 14 78 14 C82 14 85.5 18 85.5 26 L85.5 36 C85.5 38.5 83.5 40 81 40 L75 40 C72.5 40 70.5 38.5 70.5 36 Z" fill="#fbe6dc"/>
  <path d="M70.5 22 C71.5 17 74.5 14 78 14 C81.5 14 84.5 17 85.5 22 Z" fill="#fff5f0"/>
  <path class="hand-ink" pathLength="1" d="M78.5 18 C76.5 22 80 26 78 30 C76.5 33.5 79.5 37 78 42" fill="none" stroke="#5b2fa0" stroke-width="5.5" stroke-linecap="round"/>
</svg>`;
}

/** For the share images (the image renderer takes pictures as data links). */
export const handDataUri = (w = 200) => `data:image/svg+xml;base64,${Buffer.from(handSvg('og', w)).toString('base64')}`;
