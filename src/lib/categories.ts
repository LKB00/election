// Duel topics. Its own file so the Create page does not ship the whole form-checking library to phones.
export const CATEGORIES = ['general', 'politics', 'cricket', 'movies', 'music', 'food', 'tech', 'sports', 'friends'] as const;
export type Category = (typeof CATEGORIES)[number];
/** One face per topic, for the topic step on Create (a picture you recognise before you read). */
export const TOPIC_EMOJI: Record<Category, string> = { general: '💬', politics: '🗳️', cricket: '🏏', movies: '🎬', music: '🎵', food: '🍛', tech: '📱', sports: '⚽', friends: '👫' };
/** The topics Create shows first (Miller's and Hick's laws: a few at a time); "More topics" opens the rest. */
export const FIRST_TOPICS: readonly Category[] = ['politics', 'cricket', 'movies', 'food', 'friends', 'general'];
