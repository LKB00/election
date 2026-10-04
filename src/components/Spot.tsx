// Small drawn pictures for the moments that used to be only a line of text (docs/DESIGN.md, "Visual communication").
// Flat shapes in the Arogya palette, drawn the same way each time: a ballot box, slips, the inked finger's yellow.
// Inline SVG (a few hundred bytes each), no images to download; decorative, so hidden from screen readers.
type Kind = 'ballot' | 'search' | 'lost' | 'done';

export default function Spot({ kind, size = 132 }: { kind: Kind; size?: number }) {
  const ink = 'var(--ink)';
  return (
    <svg className="spot" width={size} height={(size * 3) / 4} viewBox="0 0 160 120" aria-hidden focusable="false">
      {/* the ground shadow */}
      <ellipse cx="80" cy="112" rx="58" ry="6" fill="var(--line)" opacity=".7" />
      {kind === 'search' ? (
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
