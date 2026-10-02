'use client';

/** Tell the rest of the page that you voted in a duel (the duel tiles and the banner update from it). */
export const announceVote = (pollId?: string) => window.dispatchEvent(new CustomEvent('voted', { detail: pollId }));
