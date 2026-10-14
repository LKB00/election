// Duel topics. Its own file so the Create page does not ship the whole form-checking library to phones.
export const CATEGORIES = ['general', 'politics', 'cricket', 'movies', 'music', 'food', 'tech', 'sports', 'friends'] as const;
export type Category = (typeof CATEGORIES)[number];
/** One face per topic, for the topic step on Create (a picture you recognise before you read). */
export const TOPIC_EMOJI: Record<Category, string> = { general: '💬', politics: '🗳️', cricket: '🏏', movies: '🎬', music: '🎵', food: '🍛', tech: '📱', sports: '⚽', friends: '👫' };
