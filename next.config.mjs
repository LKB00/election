/** @type {import('next').NextConfig} */
export default {
  serverExternalPackages: ['@electric-sql/pglite'],
  // The share image reads the Lato font files at runtime; ship them with that route.
  outputFileTracingIncludes: {
    '/api/og/[id]': ['./node_modules/@fontsource/lato/files/lato-latin-400-normal.woff', './node_modules/@fontsource/lato/files/lato-latin-700-normal.woff'],
    '/api/card/[id]': ['./node_modules/@fontsource/lato/files/lato-latin-400-normal.woff', './node_modules/@fontsource/lato/files/lato-latin-700-normal.woff'],
  },
};
