// The inked index finger, drawn (owner: "create one, don't use photos").
// A raised hand, nail towards you, with the indelible-ink line from the base of the nail down the skin,
// the way the polling officer draws it. One drawing for the app, the vote moment and the share images.
// The ink is one path (class "hand-ink", length 1), so the vote moment can draw it on (see .cast-hand in election.css).
// Ids get a prefix, so several copies on one page never clash.
export const HAND_RATIO = 260 / 200;

export function handSvg(p = 'h', w = 200): string {
  const h = Math.round(w * HAND_RATIO);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260" width="${w}" height="${h}">
  <defs>
    <linearGradient id="${p}sk" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#b3714b"/><stop offset="0.4" stop-color="#d4966b"/><stop offset="0.6" stop-color="#dfa47a"/><stop offset="1" stop-color="#b97752"/>
    </linearGradient>
    <linearGradient id="${p}fist" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#d79a70"/><stop offset="0.55" stop-color="#c88a60"/><stop offset="1" stop-color="#a96a45"/>
    </linearGradient>
    <linearGradient id="${p}knk" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#dda177"/><stop offset="1" stop-color="#c3855c"/>
    </linearGradient>
    <linearGradient id="${p}nail" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#f6ddd0"/><stop offset="1" stop-color="#e4b3a0"/>
    </linearGradient>
    <linearGradient id="${p}slv" x1="0" x2="1">
      <stop offset="0" stop-color="#7ea3cb"/><stop offset="0.5" stop-color="#a4c2e2"/><stop offset="1" stop-color="#7ea3cb"/>
    </linearGradient>
    <radialGradient id="${p}glow" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="${p}soft" filterUnits="userSpaceOnUse" x="0" y="0" width="200" height="260"><feGaussianBlur stdDeviation="0.35"/></filter>
  </defs>
  <path d="M86 196 L86 260 L148 260 L148 196 Z" fill="url(#${p}sk)"/>
  <path d="M77 230 Q117 222 157 230 L160 260 L74 260 Z" fill="url(#${p}slv)"/>
  <path d="M77 230 Q117 222 157 230" fill="none" stroke="#6d93bb" stroke-width="2"/>
  <path d="M72 142 C72 129 80 122 92 122 L150 122 C161 122 167 131 167 143 L167 184 C167 205 152 218 130 218 L102 218 C82 218 70 205 70 186 Z" fill="url(#${p}fist)"/>
  <path d="M72 142 C72 129 80 122 92 122 L150 122 C161 122 167 131 167 143 L167 184 C167 205 152 218 130 218 L102 218 C82 218 70 205 70 186 Z" fill="url(#${p}glow)"/>
  <path d="M115 150 C113 133 117 122 126 122 C135 122 139 132 137 150 Q126 156 115 150 Z" fill="url(#${p}knk)"/>
  <path d="M136 152 C134 137 138 127 146 127 C154 127 158 137 156 152 Q146 157 136 152 Z" fill="url(#${p}knk)"/>
  <path d="M155 154 C154 142 157 134 162 134 C167 134 169 142 168 154 Q161.5 158 155 154 Z" fill="url(#${p}knk)"/>
  <path d="M117 151 Q126 157 136 152 Q146 158 156 153 Q162 157 167 154" fill="none" stroke="#9a5d3a" stroke-opacity="0.45" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M121 131 Q126 128 131 131 M141 135 Q146 132 151 135 M159 140 Q162 138 165 140" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M68 172 C66 160 76 154 88 157 L132 169 C143 172 146 181 141 188 C137 194 129 195 121 193 L82 186 C73 184 69 180 68 172 Z" fill="url(#${p}fist)"/>
  <path d="M86 160 L130 172" stroke="#fff" stroke-opacity="0.22" stroke-width="2" stroke-linecap="round"/>
  <path d="M117 176 Q123 184 119 192" fill="none" stroke="#9a5d3a" stroke-opacity="0.35" stroke-width="1.4"/>
  <path d="M116 124 L124 124 C121 140 121 155 123 166 L116 165 Z" fill="#5a3320" opacity="0.18" filter="url(#${p}soft)"/>
  <path d="M84 158 L84 42 C84 26 91 16 100 16 C109 16 116 26 116 42 L116 158 C116 164 110 168 100 168 C90 168 84 164 84 158 Z" fill="url(#${p}sk)"/>
  <path d="M90 30 C92 22 96 19 100 19" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="3" stroke-linecap="round"/>
  <path d="M89 101 Q100 106 111 101 M90 105 Q100 109 110 105 M89 130 Q100 135 111 130" fill="none" stroke="#9a5d3a" stroke-opacity="0.4" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M89.5 42 C89.5 29 94 23 100 23 C106 23 110.5 29 110.5 42 L110.5 54 C110.5 57 108.5 59 105.5 59 L94.5 59 C91.5 59 89.5 57 89.5 54 Z" fill="url(#${p}nail)" stroke="#c99683" stroke-width="0.8"/>
  <path d="M91.5 55 Q100 52 108.5 55" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M93.5 31 C95 27 97.5 25.5 100 25.5" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="2.2" stroke-linecap="round"/>
  <g class="hand-ink-wrap" filter="url(#${p}soft)">
    <path class="hand-ink" pathLength="1" d="M100 46 C100.4 58 99.6 70 100.2 86" fill="none" stroke="#33204a" stroke-width="6" stroke-linecap="round" opacity="0.92"/>
  </g>
</svg>`;
}

/** For the share images (the image renderer takes pictures as data links). */
export const handDataUri = (w = 200) => `data:image/svg+xml;base64,${Buffer.from(handSvg('og', w)).toString('base64')}`;
