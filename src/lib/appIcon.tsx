import { ImageResponse } from 'next/og';
import { markDataUri } from './brandMark';

// The app icon (home screen, browser tab, install screen) is the Chunav mark, full bleed: the phone rounds the corners.
export function appIcon(size: number) {
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: 'flex' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markDataUri(size, false)} width={size} height={size} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
