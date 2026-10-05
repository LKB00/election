import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PALETTE, PALETTE_TOKENS, TINT_TOKENS } from '@/lib/palette';

// Share images, the app icon and the phone's top bar use src/lib/palette.ts; the site uses the tokens in arogya.css.
// They must stay the same colours.
const css = readFileSync('src/styles/arogya.css', 'utf8');
const light = css.slice(0, css.indexOf('@media'));
const dark = css.slice(css.indexOf('@media'));
const token = (block: string, name: string) => block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})\\b`))?.[1]?.toLowerCase();

describe('palette', () => {
  it('matches the light tokens', () => {
    for (const [k, name] of Object.entries(PALETTE_TOKENS)) expect([k, token(light, name)]).toEqual([k, PALETTE[k as keyof typeof PALETTE_TOKENS]]);
    TINT_TOKENS.forEach((name, n) => expect(token(light, name)).toBe(PALETTE.tints[n]));
  });
  it('matches the dark ground', () => {
    expect(token(dark, '--paper')).toBe(PALETTE.paperDark);
  });
});
