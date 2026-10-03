// A first line of defence when a duel is made: slurs and strong abuse in English, Hindi and Hinglish are refused.
// It is a short list on purpose (no false alarms on normal words). Reports and the owner's review catch the rest.
const BLOCKED = [
  // English slurs
  'nigger', 'nigga', 'faggot', 'retard', 'tranny', 'chink', 'paki', 'cunt', 'whore', 'slut',
  // Hinglish abuse
  'madarchod', 'maderchod', 'behenchod', 'bhenchod', 'benchod', 'chutiya', 'chutiye', 'chootiya', 'randi', 'bhosdi',
  'bhosdike', 'bhosdika', 'gandu', 'lund', 'lauda', 'loda', 'harami', 'haramkhor', 'kutiya', 'jhatu',
  // caste and religious slurs
  'chamar', 'chamaar', 'bhangi', 'katua', 'katwa',
  // Hindi (Devanagari)
  'मादरचोद', 'बहनचोद', 'भेनचोद', 'चूतिया', 'चुतिया', 'रंडी', 'भोसड़ी', 'भोसड़ीके', 'गांडू', 'लौड़ा', 'हरामी', 'कटुआ', 'चमार', 'भंगी',
];
const SET = new Set(BLOCKED);

/** Splits text into words (any script) and checks each one, so "Scunthorpe" or "class" never trip it. */
export function hasBlockedWord(...texts: string[]): boolean {
  return texts.some((text) =>
    text
      .toLowerCase()
      .normalize('NFC')
      .split(/[^\p{L}\p{M}]+/u)
      .some((w) => w && SET.has(w)),
  );
}

// Politicians' and parties' names: a user duel that names one is held back from public lists until the owner checks it.
// ("aap" is left out: in Hindi it also means "you".)
const POLITICAL = /(?<![\p{L}\p{M}])(modi|rahul|gandhi|kejriwal|yogi|adityanath|mamata|akhilesh|mayawati|owaisi|amit shah|nitish|tejashwi|bjp|congress|tmc|bsp|dmk|aiadmk|shiv sena|ncp|rss|मोदी|राहुल|भाजपा|कांग्रेस)(?![\p{L}\p{M}])/iu;
export const namesPolitics = (...texts: string[]) => texts.some((t) => POLITICAL.test(t));
