// The inked index finger: the one picture every Indian voter shares after voting.
// Drawn like a real hand (soft skin shading, nail, the purple line of indelible ink from the nail down onto the skin).
// Plain SVG, so the same drawing works in the app and inside the share images (next/og).
// animate: the ink is drawn on the nail, like the polling officer's brush, then sets (used once, right after voting).
export default function InkFinger({ size = 48, title, animate = false }: { size?: number; title?: string; animate?: boolean }) {
  const id = animate ? 'inkA' : 'ink';
  return (
    <svg
      className={animate ? 'ink-finger is-animated' : 'ink-finger'}
      width={size}
      height={(size * 260) / 200}
      viewBox="0 0 200 260"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f3c6a1" />
          <stop offset="0.55" stopColor="#e3a57b" />
          <stop offset="1" stopColor="#c98559" />
        </linearGradient>
        <linearGradient id={`${id}-fist`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#efbb93" />
          <stop offset="1" stopColor="#c47f55" />
        </linearGradient>
        <linearGradient id={`${id}-knuckle`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ecb38a" />
          <stop offset="1" stopColor="#d08d62" />
        </linearGradient>
        <linearGradient id={`${id}-thumb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9ac82" />
          <stop offset="1" stopColor="#c27c52" />
        </linearGradient>
        <linearGradient id={`${id}-nail`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe6da" />
          <stop offset="1" stopColor="#efc4ad" />
        </linearGradient>
      </defs>

      {/* soft shadow on the ground */}
      <ellipse cx="108" cy="248" rx="62" ry="7" fill="#24282c" opacity="0.1" />

      {/* fist */}
      <path d="M50 152 C50 130 64 120 84 120 L142 120 C162 120 172 134 172 154 L172 196 C172 224 152 242 124 242 L94 242 C68 242 50 224 50 198 Z" fill={`url(#${id}-fist)`} />
      {/* folded fingers: three knuckles */}
      <rect x="100" y="112" width="30" height="62" rx="15" fill={`url(#${id}-knuckle)`} />
      <rect x="124" y="116" width="28" height="58" rx="14" fill={`url(#${id}-knuckle)`} />
      <rect x="146" y="124" width="26" height="50" rx="13" fill={`url(#${id}-knuckle)`} />
      <path d="M126 130 L126 168 M149 138 L149 168" stroke="#b56f46" strokeWidth="2" strokeLinecap="round" opacity="0.35" />

      {/* index finger, raised */}
      <rect x="62" y="16" width="44" height="160" rx="22" fill={`url(#${id}-skin)`} />
      {/* light along the left edge, for roundness */}
      <rect x="67" y="40" width="7" height="110" rx="3.5" fill="#ffffff" opacity="0.18" />
      {/* knuckle creases */}
      <path d="M71 96 Q84 101 97 96 M72 128 Q84 133 96 128" stroke="#b56f46" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.45" />
      {/* thumb folded across the front (in front of the index finger) */}
      <rect x="44" y="164" width="86" height="32" rx="16" fill={`url(#${id}-thumb)`} transform="rotate(-10 87 180)" />
      <rect x="104" y="160" width="22" height="18" rx="9" fill="#f0c9b2" opacity="0.9" transform="rotate(-10 115 169)" />
      {/* nail */}
      <rect x="70" y="22" width="28" height="38" rx="13" fill={`url(#${id}-nail)`} />
      <path d="M73 58 Q84 64 95 58" stroke="#d99a7a" strokeWidth="1.6" fill="none" opacity="0.7" />
      <rect x="74" y="27" width="5" height="18" rx="2.5" fill="#ffffff" opacity="0.6" />

      {/* indelible ink: soaked edge, then the line from the top of the nail down onto the skin */}
      <path className="ink-bleed" d="M84 30 L84 76" stroke="#5b2aa0" strokeWidth="13" strokeLinecap="round" opacity="0.22" />
      <path className="ink-line" d="M84 30 L84 76" pathLength={1} stroke="#3a1166" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path className="ink-shine" d="M82 34 L82 56" stroke="#a98bd6" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
