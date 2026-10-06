const FIGTREE = ['./node_modules/@fontsource/figtree/files/figtree-latin-400-normal.woff', './node_modules/@fontsource/figtree/files/figtree-latin-600-normal.woff'];

/** @type {import('next').NextConfig} */
export default {
  // Duels became polls: old links keep working.
  async redirects() {
    return [{ source: '/duels', destination: '/polls', permanent: true }];
  },
  serverExternalPackages: ['@electric-sql/pglite'],
  // The share pictures read the Figtree font files at runtime (src/lib/cards.ts); ship them with every picture route.
  outputFileTracingIncludes: Object.fromEntries(
    ['/api/og/[id]', '/api/og/site', '/api/card/[id]', '/api/results/[id]'].map((route) => [route, FIGTREE]),
  ),
};
