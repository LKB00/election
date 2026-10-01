// The inked index finger: the one image every Indian voter shares after voting.
// Plain shapes only, so it works in the app and inside the share images (next/og).
export default function InkFinger({ size = 48, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={(size * 220) / 160} viewBox="0 0 160 220" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect x="34" y="104" width="104" height="96" rx="30" fill="#e3a982" />
      <rect x="72" y="104" width="30" height="40" rx="15" fill="#d99a72" />
      <rect x="104" y="108" width="30" height="38" rx="15" fill="#d99a72" />
      <rect x="30" y="140" width="72" height="30" rx="15" fill="#d18f68" />
      <rect x="38" y="14" width="36" height="128" rx="18" fill="#e3a982" />
      <rect x="44" y="20" width="24" height="30" rx="11" fill="#f5d6c2" />
      <rect x="42" y="44" width="28" height="9" rx="4.5" fill="#4b2a83" />
      <rect x="53" y="22" width="6" height="28" rx="3" fill="#4b2a83" opacity="0.9" />
      <rect x="46" y="84" width="20" height="3" rx="1.5" fill="#c9875f" opacity="0.6" />
      <rect x="46" y="112" width="20" height="3" rx="1.5" fill="#c9875f" opacity="0.6" />
    </svg>
  );
}
