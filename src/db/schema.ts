import { boolean, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const polls = pgTable(
  'polls',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    category: text('category').notNull().default('general'),
    // Hide the numbers from people who have not voted yet (avoids copying the crowd).
    hideUntilVoted: boolean('hide_until_voted').notNull().default(false),
    allowChange: boolean('allow_change').notNull().default(false),
    // Optional one-tap "why did you pick them?" answers, stored as a JSON list of short texts.
    reasons: text('reasons').notNull().default('[]'),
    // The flagship poll shown big on the home page.
    featured: boolean('featured').notNull().default(false),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('polls_created_idx').on(t.createdAt)],
);

export const options = pgTable(
  'options',
  {
    id: text('id').primaryKey(),
    pollId: text('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    imageUrl: text('image_url'),
    // Short line under the name, e.g. a role.
    subtitle: text('subtitle'),
    // Who took the photo and under which licence, shown next to it.
    imageCredit: text('image_credit'),
    position: integer('position').notNull(),
  },
  (t) => [index('options_poll_idx').on(t.pollId)],
);

export const votes = pgTable(
  'votes',
  {
    id: text('id').primaryKey(),
    pollId: text('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
    optionId: text('option_id').notNull().references(() => options.id, { onDelete: 'cascade' }),
    // Who voted. Today: a signed cookie id. Later: a user id after sign-in.
    voterKey: text('voter_key').notNull(),
    reason: text('reason'),
    // "Who's winning right now?" guess: an option id, 'skip', or null = not asked yet.
    prediction: text('prediction'),
    predictionCorrect: boolean('prediction_correct'),
    // Private code in this voter's share link (never the voter id), and the code they arrived with.
    shareCode: text('share_code'),
    via: text('via'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The rule that makes it fair: one vote per person per poll. The database enforces it.
    uniqueIndex('votes_one_per_voter').on(t.pollId, t.voterKey),
    index('votes_option_idx').on(t.optionId),
  ],
);

export const reactions = pgTable(
  'reactions',
  {
    pollId: text('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
    voterKey: text('voter_key').notNull(),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // One of each emoji per person per poll: tapping again removes it.
  (t) => [primaryKey({ columns: [t.pollId, t.voterKey, t.emoji] })],
);
