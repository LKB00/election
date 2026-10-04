import { z } from 'zod';

import { CATEGORIES } from './categories';
import { hasBlockedWord } from './moderation';
import { MAX_PHOTO_CHARS } from './limits';

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
/** "Rahul", "rahul." and "RAHUL " are the same choice (letters and numbers only; an emoji-only choice as it is). */
export const sameKey = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') || s;
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
    .pipe(z.string().min(3, 'Your question needs at least 3 letters.').max(120, 'Your question is too long (120 letters max).'))
    .refine(visible, 'Your question needs at least 3 letters.'),
  description: text().pipe(z.string().max(300)).default(''),
  category: z.enum(CATEGORIES).default('general'),
  options: z
    .array(text().pipe(z.string().min(1, 'A choice is empty.').max(60, 'A choice is too long (60 letters max).')).refine(visible, 'A choice is empty.'))
    .min(2, 'Add at least 2 choices.')
    .max(10, 'At most 10 choices.')
    .refine((a) => new Set(a.map(sameKey)).size === a.length, 'Two choices are the same. Make each one different.'),
  // One optional emoji per choice, in the same order as the choices ('' = none).
  emojis: z.array(z.string().max(16).refine((e) => e === '' || isEmoji(e), 'Pick one emoji per choice.')).max(10).default([]),
  // One optional photo per choice, in the same order ('' = none): a small JPEG made on the phone, as a data URL.
  photos: z.array(z.string().max(MAX_PHOTO_CHARS).refine((p) => p === '' || isPhoto(p), 'That photo could not be used. Try another one.')).max(10).default([]),
  hideUntilVoted: z.boolean().default(true),
  allowChange: z.boolean().default(false),
  electionMode: z.boolean().default(false),
  kind: z.enum(['choice', 'rating', 'multi', 'rank']).default('choice'),
  endsAt: z
    .string()
    .datetime()
    .optional()
    .refine((v) => !v || new Date(v).getTime() > Date.now(), 'The end time must be in the future.'),
}).refine((p) => !hasBlockedWord(p.title, p.description, ...p.options), 'Please remove the abusive words.');
export type CreatePollInput = z.infer<typeof createPollSchema>;

/** Ids and share codes are plain letters, digits, "-" and "_"; anything else (a NUL byte, spaces) is refused early. */
export const isCode = (s: string | null | undefined): s is string => !!s && /^[\w-]{1,64}$/.test(s);
const code = () => z.string().regex(/^[\w-]{1,64}$/);
export const voteSchema = z.object({ optionId: code(), picks: z.array(code()).max(10).optional(), via: z.string().max(64).nullish().transform((v) => (isCode(v) ? v : null)), human: z.string().max(4096).nullish() });
export const guessSchema = z.object({ choice: code() });
export const reportSchema = z.object({ reason: z.string().min(1).max(20) });
export const adminSchema = z.object({ key: z.string().min(1).max(200), action: z.enum(['hide', 'show', 'approve', 'today']) });
