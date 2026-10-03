import { useId, useMemo } from 'react';
import { handSvg } from '@/lib/inkHand';

// The inked index finger, drawn (src/lib/inkHand.ts). Shown small after you vote, and on "You voted in every live duel".
// The animated version (the ink drawn on with the rod) lives in CastVote.
export default function InkFinger({ size = 48, alt = '' }: { size?: number; alt?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  // The same object every render, so React never rebuilds the drawing while the page refreshes its numbers.
  const html = useMemo(() => ({ __html: handSvg(`i${id}`, size) }), [id, size]);
  return (
    <span
      className="ink-hand"
      style={{ width: size }}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      dangerouslySetInnerHTML={html}
    />
  );
}
