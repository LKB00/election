import { z } from 'zod';

import { CATEGORIES } from './categories';
import { hasBlockedWord } from './moderation';
import { REVEAL_IN } from './limits';
import { ERR, MAX_CHOICE, MAX_CHOICES, MAX_DETAILS, MAX_GROUP, MAX_PHOTO_CHARS, MAX_TITLE, MIN_CHOICES, MIN_TITLE } from './limits';

/** One emoji (flags, skin tones and joined emoji like 👨‍👩‍👧 count as one). */
export const isEmoji = (s: string) =>
  /^(?:[0-9#*]\uFE0F?\u20E3|\u{1F3F4}[\u{E0061}-\u{E007A}]+\u{E007F}|\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F|\u20E3)*(?:\u200D\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F)*)*)$/u.test(s);
export { CATEGORIES, type Category } from './categories';

/**
 * Typed text as it is saved: line breaks, tabs and control characters become spaces, invisible characters
 * (zero-width space, soft hyphen, direction marks) are removed, runs of spaces become one. The joiners that emoji and
 * Hindi letters need (U+200C, U+200D) stay.
 */
export const cleanText = (s: string) =>
  s
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/[\u00AD\u180E\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
export { sameKey } from './same';
import { sameKey } from './same';
/** Photos: JPEG only (every phone browser can make one, and the share-image renderer can draw it), at most ~110 KB. */
export { MAX_PHOTO_CHARS };
export function isPhoto(dataUrl: string): boolean {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!m) return false;
  const head = atob(m[1].slice(0, 8));
  return head.charCodeAt(0) === 0xff && head.charCodeAt(1) === 0xd8 && head.charCodeAt(2) === 0xff;
}
/** Has something you can see: a letter, a number or an emoji (not only joiners and dots). */
const visible = (s: string) => /[\p{L}\p{N}\p{Extended_Pictographic}]/u.test(s);
const text = () => z.string().max(1000).transform(cleanText);

export const createPollSchema = z.object({
  title: text()
    .pipe(z.string().min(MIN_TITLE, ERR.titleShort).max(MAX_TITLE, ERR.titleLong))
    .refine(visible, ERR.titleShort),
  description: text().pipe(z.string().max(MAX_DETAILS)).default(''),
  category: z.enum(CATEGORIES).default('general'),
  options: z
    .array(text().pipe(z.string().min(1, 'One choice is empty. Fill it in or remove it.').max(MAX_CHOICE, ERR.choiceLong)).refine(visible, 'One choice is empty. Fill it in or remove it.'))
    .min(MIN_CHOICES, ERR.fewChoices)
    .max(MAX_CHOICES, ERR.manyChoices)
    .refine((a) => new Set(a.map(sameKey)).size === a.length, 'Two choices are the same. Make each one different.'),
  // One optional emoji per choice, in the same order as the choices ('' = none).
  emojis: z.array(z.string().max(16).refine((e) => e === '' || isEmoji(e), 'Pick one emoji per choice.')).max(MAX_CHOICES).default([]),
  // One optional photo per choice, in the same order ('' = none): a small JPEG made on the phone, as a data URL.
  photos: z.array(z.string().max(MAX_PHOTO_CHARS).refine((p) => p === '' || isPhoto(p), 'That photo could not be used. Try another one.')).max(MAX_CHOICES).default([]),
  hideUntilVoted: z.boolean().default(true),
  allowChange: z.boolean().default(false),
  electionMode: z.boolean().default(false),
  // Was the "I am 18+, and these photos are me or I have permission" tick. Since Oct 2026 (owner) the Rules say it and
  // adding a photo means confirming it; still accepted from older pages, no longer required.
  photoConsent: z.boolean().default(false),
  kind: z.enum(['choice', 'rating', 'multi', 'rank', 'dates']).default('choice'),
  // Each voter sees the choices in their own order (not for rating scales or dates, which have a natural order).
  shuffle: z.boolean().default(false),
  // Voters may suggest a missing choice (the maker approves it before anyone sees it).
  suggestionsOn: z.boolean().default(false),
  // "Other (write your own)" at the end of a pick-one ballot.
  allowOther: z.boolean().default(false),
  // Show results at a set time (worked out on the server, from its own clock).
  revealIn: z.enum(REVEAL_IN).default('now'),
  // The maker's name and face shown on the poll (their choice; off by default).
  showMaker: z.boolean().default(false),
  // "Ask again": the earlier poll (made by the same person) this one repeats.
  previousId: z.string().regex(/^[\w-]{1,64}$/).optional(),
  // "Called it": about a real event that has not happened yet; the creator marks what happened later.
  calledIt: z.boolean().default(false),
  // A group poll: how many people are in the group (results open when they have all voted).
  groupSize: z.number().int().min(2).max(MAX_GROUP).optional(),
  endsAt: z
    .string()
    .datetime()
    .optional()
    .refine((v) => !v || new Date(v).getTime() > Date.now(), 'The end time must be in the future.'),
}).refine((p) => !hasBlockedWord(p.title, p.description, ...p.options, ...p.emojis), 'Please remove the abusive words.');
export type CreatePollInput = z.infer<typeof createPollSchema>;

/** Ids and share codes are plain letters, digits, "-" and "_"; anything else (a NUL byte, spaces) is refused early. */
export const isCode = (s: string | null | undefined): s is string => !!s && /^[\w-]{1,64}$/.test(s);
/** Fixing a typo before anyone has voted: the question, the details and each choice's words (same rules as making it). */
export const editPollSchema = z
  .object({
    key: z.string().max(100).optional(),
    title: text().pipe(z.string().min(MIN_TITLE, ERR.titleShort).max(MAX_TITLE, ERR.titleLong)).refine(visible, ERR.titleShort),
    description: text().pipe(z.string().max(MAX_DETAILS)).default(''),
    options: z
      .array(z.object({ id: z.string().regex(/^[\w-]{1,64}$/), label: text().pipe(z.string().min(1, 'One choice is empty. Fill it in or remove it.').max(MAX_CHOICE, ERR.choiceLong)).refine(visible, 'One choice is empty. Fill it in or remove it.') }))
      .max(MAX_CHOICES, ERR.manyChoices)
      .refine((a) => new Set(a.map((o) => sameKey(o.label))).size === a.length, 'Two choices are the same. Make each one different.'),
  })
  .refine((p) => !hasBlockedWord(p.title, p.description, ...p.options.map((o) => o.label)), 'Please remove the abusive words.');
export const suggestSchema = z
  .object({ label: text().pipe(z.string().min(1, 'One choice is empty. Fill it in or remove it.').max(MAX_CHOICE, ERR.choiceLong)).refine(visible, 'One choice is empty. Fill it in or remove it.') })
  .refine((p) => !hasBlockedWord(p.label), 'Please remove the abusive words.');
const code = () => z.string().regex(/^[\w-]{1,64}$/);
export const VOTE_SOURCES = ['wa', 'ig', 'x', 'fb', 'tg', 'qr', 'link', 'other'] as const;
export const voteSchema = z.object({
  optionId: code(),
  picks: z.array(code()).max(MAX_CHOICES).optional(),
  // "Which dates work?": the dates answered "if need be" (the ticked ones in picks are "yes").
  maybes: z.array(code()).max(MAX_CHOICES).optional(),
  // What the voter wrote under "Other" (checked in castVote: length and the word filter).
  other: z.string().max(400).optional(),
  // Where the link was opened from (counted per poll only, never kept with the vote).
  src: z.enum(VOTE_SOURCES).optional().catch(undefined), via: z.string().max(64).nullish().transform((v) => (isCode(v) ? v : null)), human: z.string().max(4096).nullish() });
// A pack: one live moment (a match, a show's night) and its 2–4 polls, made together. Predictions close at startsAt.
export const packSchema = z.object({
  kind: z.enum(['match', 'show']),
  title: text().pipe(z.string().min(MIN_TITLE, ERR.titleShort).max(80)),
  startsAt: z
    .string()
    .datetime()
    .refine((v) => new Date(v).getTime() > Date.now(), 'The end time must be in the future.')
    .refine((v) => new Date(v).getTime() < Date.now() + 30 * 86_400_000, 'Pick a time in the next 30 days.'),
  polls: z.array(z.unknown()).min(2).max(4),
}).refine((p) => !hasBlockedWord(p.title), 'Please remove the abusive words.');
export const outcomeSchema = z.object({ optionId: code(), key: z.string().min(1).max(200) });
export const guessSchema = z.object({ choice: code() });
export const reportSchema = z.object({ reason: z.string().min(1).max(20) });
export const adminSchema = z.object({ key: z.string().min(1).max(200), action: z.enum(['hide', 'show', 'approve', 'today', 'resume', 'plan']), closeTonight: z.boolean().optional(), day: z.string().max(10).nullable().optional() });
