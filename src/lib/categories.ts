// Duel topics. Its own file so the Create page does not ship the whole form-checking library to phones.
export const CATEGORIES = ['general', 'politics', 'cricket', 'movies', 'music', 'food', 'tech', 'sports', 'friends'] as const;
export type Category = (typeof CATEGORIES)[number];
