// The letters in a choice's circle when it has no photo or emoji: "Narendra Modi" → "NM".
// When two choices would show the same letters ("Chai" and "Coffee" are both "C"), those use the first two
// letters of their name instead ("Ch", "Co"); if even that clashes, the ballot number.
const graphemes = (text: string) =>
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((s) => s.segment) : [...text];

// Only letters and digits count, so "🍕 Pizza" is "P" and a flag never leaves half a character behind.
// A choice that is only an emoji ("🔥") shows that whole emoji.
export const initialsOf = (label: string) =>
  label
    .split(/\s+/)
    .map((w) => [...w.replace(/[^\p{L}\p{N}]/gu, '')][0])
    .filter(Boolean)
    .slice(0, 2)
    .map((c) => c!.toUpperCase())
    .join('') || (graphemes(label.trim())[0] ?? '');

/** The share-image renderer cannot join Hindi (or other Indian-script) letters: such text is left out of images. */
export const drawable = (text: string) => !/[\u0900-\u0DFF]/.test(text);

/**
 * Shortens text for the share images: never cuts an emoji or a Hindi letter in half (counts what you see, not code
 * units), stops at a space when one is near, and adds "…".
 */
export function clip(text: string, max: number): string {
  const seg = graphemes(text);
  if (seg.length <= max) return text;
  const cut = seg.slice(0, max - 1).join('');
  const space = cut.lastIndexOf(' ');
  return (space > cut.length * 0.6 ? cut.slice(0, space) : cut).trimEnd() + '…';
}

const firstTwo = (label: string) => {
  const letters = [...label.replace(/[^\p{L}\p{N}]/gu, '')];
  return letters.length ? letters[0]!.toUpperCase() + (letters[1] ?? '').toLowerCase() : '';
};

export function faceLabels(labels: string[]): string[] {
  const first = labels.map(initialsOf);
  const clash = (list: string[], i: number) => list.filter((x) => x === list[i]).length > 1;
  const second = first.map((v, i) => (clash(first, i) ? firstTwo(labels[i]) : v));
  return second.map((v, i) => (!v || clash(second, i) ? String(i + 1) : v));
}
