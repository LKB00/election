// The letters in a choice's circle when it has no photo or emoji: "Narendra Modi" → "NM".
// When two choices would show the same letters ("Chai" and "Coffee" are both "C"), those use the first two
// letters of their name instead ("Ch", "Co"); if even that clashes, the ballot number.
export const initialsOf = (label: string) =>
  label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => [...w][0]!.toUpperCase()).join('');

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
