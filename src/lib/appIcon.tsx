import { ImageResponse } from 'next/og';
import { PALETTE } from './palette';

// The app icon is the logo mark: an ink disc with a lime dot (lime = "you"), on the paper colour.
export function appIcon(size: number) {
  const disc = Math.round(size * 0.56);
  const dot = Math.round(size * 0.2);
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: PALETTE.paper }}>
        <div style={{ width: disc, height: disc, borderRadius: disc, background: PALETTE.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: dot, height: dot, borderRadius: dot, background: PALETTE.lime }} />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
