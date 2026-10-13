import { appIcon } from '@/lib/appIcon';

// Browsers keep this icon for a year under a link made from THIS file's text, not the picture.
// When the logo changes, bump the version so phones and tabs fetch the new one.
// Logo version 3 (balanced hand, Oct 2026).

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';
export default function Icon() {
  return appIcon(512);
}
