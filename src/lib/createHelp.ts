// Small helpers that make "Start a duel" quicker: choices read out of the question, and a fitting emoji per choice.

/** "Virat, Rohit or Dhoni?" → ["Virat", "Rohit", "Dhoni"]. Null when the question does not list choices. */
export function choicesFromQuestion(question: string): string[] | null {
  let s = question.trim().replace(/[?？।!.]+$/u, '');
  if (s.includes(':')) s = s.slice(s.lastIndexOf(':') + 1);
  const parts = s
    .split(/\s*,\s*|\s+(?:vs\.?|versus|or|ya|या|बनाम)\s+/iu)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length < 2 || parts.length > 10) return null;
  // "Who is better Virat or Rohit" → the first part keeps only as many words as the other choices have.
  const words = (x: string) => x.split(/\s+/).length;
  const longest = Math.max(...parts.slice(1).map(words));
  if (words(parts[0]) > longest + 1) parts[0] = parts[0].split(/\s+/).slice(-longest).join(' ');
  const out = parts.map((x) => x.charAt(0).toUpperCase() + x.slice(1));
  if (out.some((x) => x.length > 60) || new Set(out.map((x) => x.toLowerCase())).size !== out.length) return null;
  return out;
}

// A short list on purpose: common duel topics in English, Hinglish and Hindi. Whole words only ("आम" never matches "आमिर").
const HINTS: [string[], string][] = [
  [['chai', 'tea', 'चाय'], '🫖'],
  [['coffee', 'कॉफ़ी', 'कॉफी'], '☕'],
  [['biryani', 'बिरयानी'], '🍛'],
  [['pizza', 'पिज़्ज़ा', 'पिज्जा'], '🍕'],
  [['burger', 'बर्गर'], '🍔'],
  [['samosa', 'momo', 'momos', 'समोसा', 'मोमो'], '🥟'],
  [['mango', 'aam', 'आम'], '🥭'],
  [['ice cream', 'icecream', 'आइसक्रीम'], '🍦'],
  [['cricket', 'क्रिकेट'], '🏏'],
  [['football', 'soccer', 'फ़ुटबॉल', 'फुटबॉल'], '⚽'],
  [['beach', 'sea', 'समुद्र'], '🏖️'],
  [['mountains', 'mountain', 'hills', 'pahad', 'पहाड़'], '🏔️'],
  [['movie', 'movies', 'film', 'theatre', 'theater', 'cinema', 'फ़िल्म', 'फिल्म'], '🎬'],
  [['music', 'song', 'songs', 'गाना', 'संगीत'], '🎵'],
  [['dog', 'dogs', 'कुत्ता'], '🐶'],
  [['cat', 'cats', 'बिल्ली'], '🐱'],
  [['home', 'ghar', 'घर'], '🏠'],
  [['summer', 'garmi', 'गर्मी'], '☀️'],
  [['winter', 'sardi', 'सर्दी'], '❄️'],
  [['monsoon', 'rain', 'barish', 'बारिश'], '🌧️'],
  [['yes', 'haan', 'हां', 'हाँ'], '👍'],
  [['no', 'na', 'nahi', 'ना', 'नहीं'], '👎'],
];
const RULES = HINTS.map(([words, emoji]) => [new RegExp(`(?<![\\p{L}\\p{M}])(?:${words.join('|')})(?![\\p{L}\\p{M}])`, 'iu'), emoji] as const);

/** A fitting emoji for a choice ("Chai" → 🍵), or '' when nothing fits. */
export const emojiFor = (label: string) => RULES.find(([re]) => re.test(label.normalize('NFC')))?.[1] ?? '';
