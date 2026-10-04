'use client';

export type VotedEvent = { id: string; delta: 1 | -1 };
/** Tell the rest of the page that you voted in a duel (+1) or took the vote back (-1). The tiles and the banner update from it. */
export const announceVote = (id: string, delta: 1 | -1 = 1) =>
  window.dispatchEvent(new CustomEvent<VotedEvent>('voted', { detail: { id, delta } }));
