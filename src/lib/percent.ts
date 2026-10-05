/** Whole-number percentages that always add up to 100 (largest remainder), for pick-one shares: 33/33/34, not 33/33/33. */
export function wholePercents(raw: number[]): number[] {
  if (!raw.some((r) => r > 0)) return raw.map(() => 0);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((s, n) => s + n, 0);
  raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => {
    if (left-- > 0) out[i]++;
  });
  return out;
}

/** Shares that are not parts of one whole (pick several, dates, rank points) are each rounded on their own. */
export const sharesAddUp = (kind: string) => kind === 'choice' || kind === 'rating';
