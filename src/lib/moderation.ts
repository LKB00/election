// A first line of defence when a poll is made: slurs and strong abuse in English, Hindi and Hinglish are refused.
// It is a short list on purpose (no false alarms on normal words). Reports and the owner's Hide catch the rest.
const ENGLISH = [
  // English slurs
  'nigger', 'nigga', 'faggot', 'retard', 'tranny', 'chink', 'paki', 'cunt', 'whore', 'slut',
];
// Hindi abuse in Latin letters. People spell these many ways (chutiya, chootia, chutiyaa), so they are also matched
// after folding spellings (fold below). Abbreviations like "bc" or "mc" are left out: they are also normal words.
const HINGLISH = [
  'madarchod', 'maderchod', 'madarchood', 'behenchod', 'bhenchod', 'benchod', 'bhanchod', 'chutiya', 'chutiye', 'chutiyapa',
  'randi', 'randwa', 'bhosdi', 'bhosdike', 'bhosdika', 'bhosdiwale', 'bhosda', 'bhosadi', 'bhosadike', 'gandu', 'gaandu', 'gaand',
  'harami', 'haramkhor', 'haramzada', 'haramzadi', 'kutiya', 'jhatu', 'jhaant', 'jhant', 'bhadwa', 'bhadwe', 'bhadve',
  'chinal', 'lodu', 'lavde', 'lawde', 'lavda', 'lavdu', 'lauday', 'bsdk', 'bkl', 'mkc', 'bhosdk',
  // caste and religious slurs
  'chamar', 'bhangi', 'katua', 'katue', 'chuhra', 'chuhre', 'mulle', 'mleccha',
  // Not listed although abusive in Hindi, because they are also real names, places or everyday words: lund (Lund
  // University), lauda (Niki Lauda), loda, katwa (a town), chakka (a six in cricket)
  // and kamina (a film). Reports and the owner's Hide catch abuse with them.
];
// Hindi (Devanagari). Matched after removing the dot and the nasal marks (गाँडू, गांडू and गाडू are one word), so each
// is listed once.
const DEVANAGARI = [
  'मादरचोद', 'बहनचोद', 'भेनचोद', 'भैनचोद', 'चूतिया', 'चुतिया', 'चूतिये', 'रंडी', 'रण्डी', 'भोसड़ी', 'भोसड़ीके', 'भोसड़ीवाले', 'भोसड़ा',
  'गांडू', 'गांड', 'लौड़ा', 'लौड़े', 'लवड़े', 'हरामी', 'हरामखोर', 'हरामज़ादा', 'हरामज़ादी', 'कुतिया', 'झाटू', 'झांट', 'भड़वा', 'भड़वे',
  'छिनाल', 'कटुआ', 'कटुए', 'चमार', 'भंगी', 'चूहड़ा', 'म्लेच्छ',
];

// What a word is made of once tricks are undone: invisible characters (zero-width space, soft hyphen) and "_" removed,
// digits that stand for letters read as letters (ch0tiya), and 3+ repeated letters read as one (chutiyaaa).
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };
const skeleton = (text: string) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{Cf}_]/gu, '')
    .replace(/[013457@$]/g, (c) => LEET[c]);

/** One spelling for the many ways a Hindi word is written: in Latin letters (oo/u, ee/i, w/v, z/j, doubled letters, iya/ia,
 * a final "h") and in Devanagari (the dot under ड़, the nasal marks ँ ं, the visible halant). */
const fold = (w: string) =>
  w
    .replace(/[\u093C\u0901\u0902\u094D]/g, '')
    .replace(/oo/g, 'u')
    .replace(/ee/g, 'i')
    .replace(/w/g, 'v')
    .replace(/z/g, 'j')
    .replace(/q/g, 'k')
    .replace(/ph/g, 'f')
    .replace(/(.)\1+/gu, '$1')
    .replace(/iya/g, 'ia')
    .replace(/(?<=.{3})h$/, '');

const EXACT = new Set([...ENGLISH, ...HINGLISH, ...DEVANAGARI].map((w) => skeleton(w)));
// Folded forms only for the Hindi words: folding English would turn everyday words into slurs ("pakki" into "paki").
const FOLDED = new Set([...HINGLISH, ...DEVANAGARI].map((w) => fold(skeleton(w))));
const ALL = [...EXACT, ...FOLDED];

const isBlocked = (w: string) => !!w && (EXACT.has(w) || EXACT.has(w.replace(/(.)\1{2,}/gu, '$1')) || FOLDED.has(fold(w)));

// "ch*tiya", "b**nchod": a word with stars standing for letters is checked as if the stars could be any one or two letters.
const masked = (w: string) => {
  if ((w.match(/\p{L}/gu) ?? []).length < 4) return false;
  const re = new RegExp(`^${w.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\p{L}{0,2}')}$`, 'u');
  return ALL.some((b) => re.test(b) || re.test(fold(b)));
};

// Abusive emoji (owner, Oct 2026, after a 🖕 poll): refused anywhere in a poll, in every skin tone.
const BLOCKED_EMOJI = /\u{1F595}/u; // 🖕

/** Splits text into words (any script) and checks each one, so "Scunthorpe" or "class" never trip it. Letters typed
 * apart ("c h u t i y a", "c.h.u.t.i.y.a") are joined back into one word first. */
export function hasBlockedWord(...texts: string[]): boolean {
  return texts.some((text) => {
    if (BLOCKED_EMOJI.test(text)) return true;
    const sk = skeleton(text);
    if (sk.split(/[^\p{L}\p{M}*]+/u).some((w) => w.includes('*') && masked(w))) return true;
    const words = sk.split(/[^\p{L}\p{M}]+/u).filter(Boolean);
    if (words.some(isBlocked)) return true;
    // Runs of single letters, joined: "c h u t i y a" → "chutiya".
    const runs: string[] = [];
    let cur = '';
    for (const w of words) {
      if ([...w].length === 1) cur += w;
      else (cur.length > 2 && runs.push(cur), (cur = ''));
    }
    if (cur.length > 2) runs.push(cur);
    return runs.some(isBlocked);
  });
}

// Politicians' and parties' names: a poll that names one becomes a politics poll (Election mode, silence windows).
// ("aap" is left out: in Hindi it also means "you".)
const POLITICAL = /(?<![\p{L}\p{M}])(modi|rahul|gandhi|kejriwal|yogi|adityanath|mamata|akhilesh|mayawati|owaisi|amit shah|nitish|tejashwi|bjp|congress|tmc|bsp|dmk|aiadmk|shiv sena|ncp|rss|मोदी|राहुल|भाजपा|कांग्रेस)(?![\p{L}\p{M}])/iu;
export const namesPolitics = (...texts: string[]) => texts.some((t) => POLITICAL.test(t.normalize('NFKC').replace(/\p{Cf}/gu, '')));
