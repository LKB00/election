import { z } from 'zod';

export const CATEGORIES = ['general', 'cricket', 'movies', 'music', 'food', 'tech', 'sports', 'friends'] as const;
export type Category = (typeof CATEGORIES)[number];

export const createPollSchema = z.object({
  title: z.string().trim().min(3, 'Title is too short').max(120, 'Title is too long'),
  description: z.string().trim().max(300).default(''),
  category: z.enum(CATEGORIES).default('general'),
  options: z
    .array(z.string().trim().min(1, 'Names cannot be empty').max(60, 'Name is too long'))
    .min(2, 'Add at least 2 choices')
    .max(10, 'At most 10 choices')
    .refine((a) => new Set(a.map((x) => x.toLowerCase())).size === a.length, 'Choices must be different'),
  hideUntilVoted: z.boolean().default(false),
  allowChange: z.boolean().default(false),
  endsAt: z
    .string()
    .datetime()
    .optional()
    .refine((v) => !v || new Date(v).getTime() > Date.now(), 'End time must be in the future'),
});
export type CreatePollInput = z.infer<typeof createPollSchema>;

export const voteSchema = z.object({ optionId: z.string().min(1).max(40) });
