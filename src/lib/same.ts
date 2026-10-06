// Kept apart from validation.ts so the Create form can use the same rule without loading the whole schema library.
/** "Rahul", "rahul." and "RAHUL " are the same choice (letters, Hindi vowel signs and numbers; पानी and पान differ).
 * A choice that is only numbers once emoji are dropped ("🍕 1", "🍔 1") keeps its emoji, so those differ too. */
export const sameKey = (s: string) => {
  const k = s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, '');
  return k && !/^\p{N}+$/u.test(k) ? k : s.toLowerCase().replace(/\s+/g, '');
};
