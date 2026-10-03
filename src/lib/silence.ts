// Election law: no exit polls or opinion-poll results while a real election is in its notified "silence" window
// (Sections 126 and 126A of the Representation of the People Act). During a window, politics duels keep their
// results sealed for everyone (no numbers, no exit-poll guess). Voting stays open: turnout is not a result.
//
// Add each window when the Election Commission announces it (dates in India time, +05:30).
// The owner can also add windows without a code change: SILENCE_WINDOWS='[{"from":"…","to":"…","note":"…"}]'.
export type SilenceWindow = { from: string; to: string; note?: string };

const WINDOWS: SilenceWindow[] = [];

function fromEnv(): SilenceWindow[] {
  try {
    const v = JSON.parse(process.env.SILENCE_WINDOWS ?? '[]');
    return Array.isArray(v) ? v.filter((w) => typeof w?.from === 'string' && typeof w?.to === 'string') : [];
  } catch {
    return [];
  }
}

/** The silence window in force now, if any (the one that ends last, when windows overlap). */
export function activeSilence(now = Date.now()): SilenceWindow | null {
  const on = [...WINDOWS, ...fromEnv()].filter((w) => Date.parse(w.from) <= now && now < Date.parse(w.to));
  return on.sort((a, b) => Date.parse(b.to) - Date.parse(a.to))[0] ?? null;
}

/** Results of this category are sealed right now. */
export const sealedUntil = (category: string, now = Date.now()): string | null =>
  category === 'politics' ? (activeSilence(now)?.to ?? null) : null;
