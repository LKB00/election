// "Rate it" polls: one question, a 1–5 scale of faces. Each step is stored as an ordinary choice ("1"…"5"), so every
// rule of a normal poll (one vote each, hidden results, Guess the crowd, sealing) works unchanged.
export const RATING_LABELS = ['1', '2', '3', '4', '5'];
export const RATING_EMOJIS = ['😖', '🙁', '😐', '🙂', '😍'];
export type PollKind = 'choice' | 'rating';

/** Average of a rating poll (1–5, one decimal), from the votes per step; null with no votes. */
export function ratingAverage(votesPerStep: number[]): number | null {
  const total = votesPerStep.reduce((a, b) => a + b, 0);
  if (!total) return null;
  const sum = votesPerStep.reduce((a, n, i) => a + n * (i + 1), 0);
  return Math.round((sum / total) * 10) / 10;
}

/** The face for an average (rounded to the nearest step). */
export const ratingEmoji = (avg: number) => RATING_EMOJIS[Math.min(4, Math.max(0, Math.round(avg) - 1))];
