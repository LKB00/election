// Small drawn pictures for the moments that used to be only a line of text (docs/DESIGN.md, "Empty states").
// Each empty page gets its own picture that says what will fill it (owner: "there should be specific illustrations"):
// invite = Home on an empty site (asking friends), list = a list of polls, finger = My votes (your inked votes),
// search = nothing found, lost = poll not found, done = nothing to review. Flat shapes in the Arogya palette.
// Inline SVG (a few hundred bytes each), no images to download; decorative, so hidden from screen readers.
type Kind = 'ballot' | 'search' | 'lost' | 'done' | 'invite' | 'list' | 'finger';

export default function Spot({ kind, size = 132 }: { kind: Kind; size?: number }) {
  const ink = 'var(--ink)';
  return (
    <svg className="spot" width={size} height={(size * 3) / 4} viewBox="0 0 160 120" aria-hidden focusable="false">
      {/* the ground shadow */}
      <ellipse cx="80" cy="112" rx="58" ry="6" fill="var(--line)" opacity=".7" />
      {kind === 'invite' ? (
        <>
          {/* a chat bubble holding a little poll, and a friend's reply: ask your friends anything */}
          <path d="M22 16h82a12 12 0 0 1 12 12v40a12 12 0 0 1-12 12H44l-14 12v-12h-8a12 12 0 0 1-12-12V28a12 12 0 0 1 12-12z" fill="#fff" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="24" y="27" width="56" height="6" rx="3" fill={ink} opacity=".75" />
          <rect x="24" y="41" width="72" height="12" rx="6" fill="var(--p-input)" stroke={ink} strokeWidth="2" />
          <rect x="24" y="41" width="46" height="12" rx="6" fill="var(--lime)" stroke={ink} strokeWidth="2" />
          <rect x="24" y="59" width="72" height="12" rx="6" fill="var(--p-input)" stroke={ink} strokeWidth="2" />
          <path d="M150 62v22a10 10 0 0 1-10 10h-4v9l-11-9h-15a10 10 0 0 1-10-10V62a10 10 0 0 1 10-10h30a10 10 0 0 1 10 10z" fill="var(--p-control)" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="118" cy="73" r="3" fill={ink} /><circle cx="128" cy="73" r="3" fill={ink} /><circle cx="138" cy="73" r="3" fill={ink} />
        </>
      ) : kind === 'list' ? (
        <>
          {/* poll rows waiting to be filled, the last one an empty "+" row: polls will show up here */}
          {[{ y: 12, tone: 'var(--p-input)' }, { y: 44, tone: 'var(--p-feedback)' }].map((r) => (
            <g key={r.y}>
              <rect x="22" y={r.y} width="116" height="26" rx="10" fill="#fff" stroke={ink} strokeWidth="2.5" />
              <circle cx="37" cy={r.y + 13} r="7" fill={r.tone} stroke={ink} strokeWidth="2" />
              <rect x="50" y={r.y + 10} width="54" height="6" rx="3" fill={ink} opacity=".3" />
              <rect x="114" y={r.y + 10} width="14" height="6" rx="3" fill={ink} opacity=".2" />
            </g>
          ))}
          <rect x="22" y="76" width="116" height="26" rx="10" fill="none" stroke={ink} strokeWidth="2.5" strokeDasharray="5 5" />
          <circle cx="37" cy="89" r="8" fill="var(--lime)" stroke={ink} strokeWidth="2" />
          <path d="M37 85v8M33 89h8" stroke={ink} strokeWidth="2.25" strokeLinecap="round" />
        </>
      ) : kind === 'finger' ? (
        <>
          {/* a raised finger with the ink mark, beside an empty slip: your inked votes will show here */}
          <rect x="44" y="58" width="50" height="46" rx="16" fill="#f6caa4" stroke={ink} strokeWidth="2.5" />
          <rect x="58" y="12" width="22" height="58" rx="11" fill="#f6caa4" stroke={ink} strokeWidth="2.5" />
          <path d="M44 74h50M44 88h50" stroke={ink} strokeWidth="2" opacity=".35" strokeLinecap="round" />
          <rect x="65" y="16" width="8" height="15" rx="4" fill="#5b4bd6" />
          <rect x="106" y="34" width="34" height="46" rx="6" fill="#fff" stroke={ink} strokeWidth="2.5" strokeDasharray="5 4" transform="rotate(6 123 57)" />
          <circle cx="123" cy="52" r="7" fill="none" stroke={ink} strokeWidth="2" transform="rotate(6 123 57)" />
          <rect x="113" y="64" width="22" height="5" rx="2.5" fill={ink} opacity=".25" transform="rotate(6 123 57)" />
        </>
      ) : kind === 'search' ? (
        <>
          {/* two slips and a magnifying glass: looking for a poll that is not there yet */}
          <rect x="34" y="26" width="52" height="68" rx="8" fill="var(--p-feedback)" stroke={ink} strokeWidth="2.5" transform="rotate(-8 60 60)" />
          <rect x="56" y="22" width="52" height="68" rx="8" fill="#fff" stroke={ink} strokeWidth="2.5" />
          <path d="M66 40h32M66 52h24M66 64h28" stroke={ink} strokeWidth="2.5" strokeLinecap="round" opacity=".35" />
          <circle cx="108" cy="72" r="18" fill="var(--lime)" fillOpacity=".55" stroke={ink} strokeWidth="3" />
          <path d="M121 85l14 14" stroke={ink} strokeWidth="6" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* the ballot box: lid, slot, and a slip going in */}
          <rect x="68" y={kind === 'lost' ? 4 : 10} width="26" height="36" rx="4" fill="#fff" stroke={ink} strokeWidth="2.5" transform={`rotate(${kind === 'lost' ? 24 : -6} 81 28)`} />
          {(kind === 'ballot' || kind === 'done') && <circle cx="81" cy="24" r="7" fill="var(--lime)" stroke={ink} strokeWidth="2" />}
          {(kind === 'ballot' || kind === 'done') && <path d="M77.5 24l2.5 2.5 4.5-5" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          {kind === 'lost' && <text x="88" y="33" textAnchor="middle" fontSize="18" fontWeight="800" fill={ink} transform="rotate(24 81 28)">?</text>}
          <rect x="30" y="52" width="100" height="56" rx="10" fill="var(--p-input)" stroke={ink} strokeWidth="2.5" />
          <rect x="24" y="42" width="112" height="16" rx="8" fill="#fff" stroke={ink} strokeWidth="2.5" />
          <rect x="62" y="47" width="36" height="5" rx="2.5" fill={ink} />
          {/* a yellow label on the front (yellow = you); "done" puts a tick on it */}
          <rect x="58" y="72" width="44" height="18" rx="9" fill="var(--lime)" stroke={ink} strokeWidth="2" />
          {kind === 'done' && <path d="M72 81l5 5 10-10" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        </>
      )}
    </svg>
  );
}
