// The Arogya Line colours for places that cannot read the CSS tokens: share images, the app icon, the phone's top bar
// and the install screen. Each value is the same as its token in src/styles/arogya.css (tests/palette.test.ts checks),
// so change a colour in both places. "lime" is the brand yellow: the colour of "you".
export const PALETTE = {
  ink: '#1d1b18', // --ink
  paper: '#fbf9f6', // --paper
  paperDark: '#141311', // --paper in the dark look
  sand: '#f5f2ed', // --sand
  white: '#ffffff', // --card
  lime: '#fcd12a', // --lime
  green: '#276b43', // --positive
  muted: '#5e5a53', // --ink-2
  inkMark: '#5b2fa0', // --ink-mark
  tints: ['#e0e3ff', '#fce4ec', '#ddf1e3', '#fdf4df'], // --p-input, --p-feedback, --p-control, --p-trust
} as const;

/** The CSS token each colour mirrors (for the test). */
export const PALETTE_TOKENS: Record<Exclude<keyof typeof PALETTE, 'tints' | 'paperDark'>, string> = {
  ink: '--ink',
  paper: '--paper',
  sand: '--sand',
  white: '--card',
  lime: '--lime',
  green: '--positive',
  muted: '--ink-2',
  inkMark: '--ink-mark',
};
export const TINT_TOKENS = ['--p-input', '--p-feedback', '--p-control', '--p-trust'];
