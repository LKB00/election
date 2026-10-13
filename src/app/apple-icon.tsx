import { appIcon } from '@/lib/appIcon';

// Browsers keep this icon for a year under a link made from THIS file's text, not the picture.
// When the logo changes, bump the version so phones and tabs fetch the new one.
// Logo version 3 (balanced hand, Oct 2026).

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export default function AppleIcon() {
  return appIcon(180);
}
