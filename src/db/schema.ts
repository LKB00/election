import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The rule that makes it fair: one vote per person per poll. The database enforces it.
    uniqueIndex('votes_one_per_voter').on(t.pollId, t.voterKey),
    index('votes_option_idx').on(t.optionId),
  ],
);
