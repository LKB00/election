import { z } from 'zod';

import { CATEGORIES } from './categories';
import { hasBlockedWord } from './moderation';

/** One emoji (flags, skin tones and joined emoji like 👨‍👩‍👧 count as one). */
export const isEmoji = (s: string) =>
  /^(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F|\u20E3)*(?:\u200D\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F)*)*)$/u.test(s);
export { CATEGORIES, type Category } from './categories';

export const createPollSchema = z.object({
  title: z.string().trim().min(3, 'Your question needs at least 3 letters.').max(120, 'Your question is too long (120 letters max).'),
  description: z.string().trim().max(300).default(''),
  category: z.enum(CATEGORIES).default('general'),
  options: z
    .array(z.string().trim().min(1, 'A choice is empty.').max(60, 'A choice is too long (60 letters max).'))
    .min(2, 'Add at least 2 choices.')
    .max(10, 'At most 10 choices.')
    .refine((a) => new Set(a.map((x) => x.toLowerCase())).size === a.length, 'Two choices are the same. Make each one different.'),
  // One optional emoji per choice, in the same order as the choices ('' = none).
  emojis: z.array(z.string().max(16).refine((e) => e === '' || isEmoji(e), 'Pick one emoji per choice.')).max(10).default([]),
  hideUntilVoted: z.boolean().default(true),
  allowChange: z.boolean().default(false),
  endsAt: z
    .string()
    .datetime()
    .optional()
    .refine((v) => !v || new Date(v).getTime() > Date.now(), 'The end time must be in the future.'),
}).refine((p) => !hasBlockedWord(p.title, p.description, ...p.options), 'Please remove the abusive words.');
export type CreatePollInput = z.infer<typeof createPollSchema>;

export const voteSchema = z.object({ optionId: z.string().min(1).max(40), via: z.string().max(20).nullish(), human: z.string().max(4096).nullish() });
export const guessSchema = z.object({ choice: z.string().min(1).max(40) });
export const reportSchema = z.object({ reason: z.string().min(1).max(20) });
export const adminSchema = z.object({ key: z.string().min(1).max(200), action: z.enum(['hide', 'show', 'approve']) });
