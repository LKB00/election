import type { MetadataRoute } from 'next';

// "Add to home screen": opens full screen like an app, with no install from a store (light on phone storage and data).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Election · Who would you pick?',
    short_name: 'Election',
    description: 'Fun duels. Vote in one tap, see where everyone stands. Not official.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbfbf7',
    theme_color: '#fbfbf7',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
