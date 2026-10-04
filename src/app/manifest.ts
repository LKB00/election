import type { MetadataRoute } from 'next';

// "Add to home screen": opens full screen like an app, with no install from a store (light on phone storage and data).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Election · What does everyone think?',
    short_name: 'Election',
    description: 'Ask anything. Vote in one tap, see what everyone thinks. Just for fun, not official.',
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
