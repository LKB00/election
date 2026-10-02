// The inked index finger: the one picture every Indian voter shares after voting.
// A real photo (Wikimedia Commons, GaneshBhakt, CC BY-SA 3.0, edited): see public/ink/CREDITS.md.
// animate: the real ink is "brushed" down from the nail, over the same finger without ink, then the
// photo shows exactly as taken. Used once, right after voting. Share images use the plain photo.
export const INK_PHOTO = '/ink/finger-inked.jpg';
export const INK_CREDIT = 'GaneshBhakt, CC BY-SA 3.0 (edited)';

export default function InkFinger({ size = 48, animate = false, alt = '' }: { size?: number; animate?: boolean; alt?: string }) {
  const h = Math.round((size * 5) / 4);
  return (
    <span className={'ink-photo' + (animate ? ' is-animated' : '')} style={{ width: size, height: h }} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {animate && <img className="ink-photo-clean" src="/ink/finger-clean.webp" alt="" width={size} height={h} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ink-photo-inked" src="/ink/finger-inked.webp" alt="" width={size} height={h} />
    </span>
  );
}
