import type { MetadataRoute } from 'next';
import { dict } from '@/lib/i18n';
import { PALETTE } from '@/lib/palette';

// "Add to home screen": opens full screen like an app, with no install from a store (light on phone storage and data).
// One install screen for every phone, so it is in English (the app itself follows the visitor's language).
export default function manifest(): MetadataRoute.Manifest {
  const t = dict.en;
  return {
    name: `${t.siteName} · ${t.splashLine}`,
    short_name: t.siteName,
    description: t.metaDesc,
    start_url: '/',
    display: 'standalone',
    background_color: PALETTE.paper,
    theme_color: PALETTE.paper,
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
