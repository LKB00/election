// A first line of defence when a duel is made: slurs and strong abuse in English, Hindi and Hinglish are refused.
// It is a short list on purpose (no false alarms on normal words). Reports and the owner's review catch the rest.
const BLOCKED = [
  // English slurs
  'nigger', 'nigga', 'faggot', 'retard', 'tranny', 'chink', 'paki', 'cunt', 'whore', 'slut',
  // Hinglish abuse
  'madarchod', 'maderchod', 'behenchod', 'bhenchod', 'benchod', 'chutiya', 'chutiye', 'chootiya', 'randi', 'bhosdi',
  'bhosdike', 'bhosdika', 'gandu', 'harami', 'haramkhor', 'kutiya', 'jhatu',
  // caste and religious slurs
  'chamar', 'chamaar', 'bhangi', 'katua',
  // Not listed although abusive in Hindi, because they are also real names and places: lund (Lund University), lauda
  // (Niki Lauda), loda, katwa (a town). Reports and the owner's review catch abuse with them.
  // Hindi (Devanagari)
  'मादरचोद', 'बहनचोद', 'भेनचोद', 'चूतिया', 'चुतिया', 'रंडी', 'भोसड़ी', 'भोसड़ीके', 'गांडू', 'लौड़ा', 'हरामी', 'कटुआ', 'चमार', 'भंगी',
];
const SET = new Set(BLOCKED.map((w) => w.normalize('NFKC')));

// What a word is made of once tricks are undone: invisible characters (zero-width space, soft hyphen) and "_" removed,
// digits that stand for letters read as letters (ch0tiya), and 3+ repeated letters read as one (chutiyaaa).
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };
const skeleton = (text: string) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{Cf}_]/gu, '')
    .replace(/[013457@$]/g, (c) => LEET[c]);

/** Splits text into words (any script) and checks each one, so "Scunthorpe" or "class" never trip it. */
// Abusive emoji (owner, Oct 2026, after a 🖕 poll): refused anywhere in a poll, in every skin tone.
const BLOCKED_EMOJI = /\u{1F595}/u; // 🖕
export function hasBlockedWord(...texts: string[]): boolean {
  return texts.some((text) =>
    BLOCKED_EMOJI.test(text) ||
    skeleton(text)
      .split(/[^\p{L}\p{M}]+/u)
      .some((w) => w && (SET.has(w) || SET.has(w.replace(/(.)\1{2,}/gu, '$1')))),
  );
}

// Politicians' and parties' names: a user duel that names one is held back from public lists until the owner checks it.
// ("aap" is left out: in Hindi it also means "you".)
const POLITICAL = /(?<![\p{L}\p{M}])(modi|rahul|gandhi|kejriwal|yogi|adityanath|mamata|akhilesh|mayawati|owaisi|amit shah|nitish|tejashwi|bjp|congress|tmc|bsp|dmk|aiadmk|shiv sena|ncp|rss|मोदी|राहुल|भाजपा|कांग्रेस)(?![\p{L}\p{M}])/iu;
export const namesPolitics = (...texts: string[]) => texts.some((t) => POLITICAL.test(t.normalize('NFKC').replace(/\p{Cf}/gu, '')));
