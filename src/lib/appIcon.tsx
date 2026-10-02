import { ImageResponse } from 'next/og';

// The app icon is the logo mark: an ink disc with a lime dot (lime = "you"), on the paper colour.
export function appIcon(size: number) {
  const disc = Math.round(size * 0.56);
  const dot = Math.round(size * 0.2);
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fbfbf7' }}>
        <div style={{ width: disc, height: disc, borderRadius: disc, background: '#24282c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: dot, height: dot, borderRadius: dot, background: '#c2ef72' }} />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
