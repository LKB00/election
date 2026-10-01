import { z } from 'zod';

export const CATEGORIES = ['general', 'cricket', 'movies', 'music', 'food', 'tech', 'sports', 'friends'] as const;
export type Category = (typeof CATEGORIES)[number];

export const createPollSchema = z.object({
  title: z.string().trim().min(3, 'Your question needs at least 3 letters.').max(120, 'Your question is too long (120 letters max).'),
  description: z.string().trim().max(300).default(''),
  category: z.enum(CATEGORIES).default('general'),
  options: z
    .array(z.string().trim().min(1, 'A choice is empty.').max(60, 'A choice is too long (60 letters max).'))
    .min(2, 'Add at least 2 choices.')
    .max(10, 'At most 10 choices.')
    .refine((a) => new Set(a.map((x) => x.toLowerCase())).size === a.length, 'Two choices are the same. Make each one different.'),
  hideUntilVoted: z.boolean().default(false),
  allowChange: z.boolean().default(false),
  endsAt: z
    .string()
    .datetime()
    .optional()
    .refine((v) => !v || new Date(v).getTime() > Date.now(), 'The end time must be in the future.'),
});
export type CreatePollInput = z.infer<typeof createPollSchema>;

export const voteSchema = z.object({ optionId: z.string().min(1).max(40) });
