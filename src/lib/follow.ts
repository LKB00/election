import { CATEGORIES } from './categories';

// Follow a topic (docs/DESIGN.md, "Follow a topic"): kept on this phone only, in a cookie (no profile, no list on the
// server), so Home can put followed topics first. Only real topic names are read back.
export const FOLLOW_COOKIE = 'election-topics';
export const FOLLOW_MAX = 6;
export const readFollowed = (raw: string | undefined | null): string[] =>
  [...new Set((raw ?? '').split(',').map((s) => decodeURIComponent(s.trim())))].filter((c) => (CATEGORIES as readonly string[]).includes(c)).slice(0, FOLLOW_MAX);
