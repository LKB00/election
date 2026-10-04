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
    // Today's question: the one poll (made by a person, picked by the owner) shown first on Home.
    featured: boolean('featured').notNull().default(false),
    // Taken down by the owner (or by enough reports). Hidden duels act as if they do not exist.
    hidden: boolean('hidden').notNull().default(false),
    // Checked by the owner. Only reviewed duels go into search, and only reviewed politics duels are listed.
    reviewed: boolean('reviewed').notNull().default(false),
    // The creator added photos from their phone: the duel stays out of public lists until the owner has looked.
    hasPhotos: boolean('has_photos').notNull().default(false),
    // Voting paused until this time after a sudden flood of votes (see src/lib/flood.ts). The owner can resume it.
    frozenUntil: timestamp('frozen_until', { withTimezone: true }),
    // Planned as Today's question on this India day ("2026-11-08"); it takes over that morning by itself.
    todayOn: text('today_on'),
    // Election mode: the full booth ritual (EVM, VVPAT slip, voter ID, counting day). Politics polls always have it.
    electionMode: boolean('election_mode').notNull().default(false),
    // What kind of question: 'choice' (pick one) or 'rating' (a 1–5 scale of faces). See src/lib/rating.ts.
    kind: text('kind').notNull().default('choice'),
    // "Called it": a question about something that will happen. When it does, the creator marks the choice that came
    // true (outcome = an option id) and every voter sees whether they called it. No score is kept across polls.
    calledIt: boolean('called_it').notNull().default(false),
    outcome: text('outcome'),
    outcomeAt: timestamp('outcome_at', { withTimezone: true }),
    // SHA-256 of the creator's private key (kept on their phone), which lets them mark the outcome.
    manageHash: text('manage_hash'),
    // Part of a match-day or show-night pack (see packs).
    packId: text('pack_id'),
    // A group poll: results stay closed for everyone until this many people have voted (or the poll ends).
    groupSize: integer('group_size'),
    // The profile that made this poll (profiles are optional for voting; making a poll needs one).
    ownerId: text('owner_id'),
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
    // Optional emoji the creator picked for this choice (shown in the face circle when there is no photo).
    emoji: text('emoji'),
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

export const reports = pgTable(
  'reports',
  {
    pollId: text('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
    voterKey: text('voter_key').notNull(),
    reason: text('reason').notNull(),
    ipHash: text('ip_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // One report per person per duel, so one person cannot take a duel down alone.
  (t) => [primaryKey({ columns: [t.pollId, t.voterKey] })],
);

// Photos people add to their choices (from their phone). Small JPEGs (made smaller on the phone first), kept as base64
// next to the duel, so no extra storage service is needed. Served by /api/img/[id].
export const photos = pgTable(
  'photos',
  {
    id: text('id').primaryKey(),
    pollId: text('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
    data: text('data').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('photos_poll_idx').on(t.pollId)],
);

// "Pick several" polls: every choice a voter ticked. The vote row stays the one ballot per voter (unique index);
// these rows hang off it and go when it goes (undo, delete my votes).
export const votePicks = pgTable(
  'vote_picks',
  {
    voteId: text('vote_id').notNull().references(() => votes.id, { onDelete: 'cascade' }),
    pollId: text('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
    optionId: text('option_id').notNull().references(() => options.id, { onDelete: 'cascade' }),
    // "Rank" polls: the place this voter gave the choice (1 = first). Empty for "pick several".
    rank: integer('rank'),
  },
  (t) => [primaryKey({ columns: [t.voteId, t.optionId] }), index('vote_picks_poll_idx').on(t.pollId)],
);

// Where recent votes came from, to spot floods: a scrambled network code (never the address, never the voter) and the
// time. Rows older than an hour are deleted. See src/lib/flood.ts.
export const voteFlow = pgTable(
  'vote_flow',
  {
    pollId: text('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
    net: text('net').notNull(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('vote_flow_poll_at_idx').on(t.pollId, t.at), index('vote_flow_at_idx').on(t.at)],
);

// A match-day or show-night pack: a few polls around one live moment ("CSK vs MI", "Bigg Boss eviction night").
// Predictions close when it starts (starts_at); the polls point here with polls.pack_id.
export const packs = pgTable(
  'packs',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(), // 'match' | 'show'
    title: text('title').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('packs_starts_idx').on(t.startsAt)],
);

// "Tell me the result" (web push, opt-in per poll): the phone's push address (from the browser; no name or number)
// and the polls it asked about. A want is deleted once its one alert is sent.
export const pushSubs = pgTable('push_subs', {
  endpoint: text('endpoint').primaryKey(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  voterKey: text('voter_key').notNull(),
  lastSentAt: timestamp('last_sent_at', { withTimezone: true }),
  // The language the alert is written in (the one on screen when they asked).
  lang: text('lang').notNull().default('en'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const pushWants = pgTable(
  'push_wants',
  {
    pollId: text('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().references(() => pushSubs.endpoint, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.endpoint] })],
);

// Profiles: optional, needed only to make polls. Signed in with a passkey (the phone's fingerprint, face or screen lock):
// no password, phone number or email is ever stored. Votes are NEVER linked to a profile (they stay with the anonymous
// voter cookie), so a profile cannot tell anyone, us included, how its owner voted.
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  avatar: text('avatar').notNull().default('🙂'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const passkeys = pgTable(
  'passkeys',
  {
    id: text('id').primaryKey(), // the credential id (base64url)
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    publicKey: text('public_key').notNull(), // base64url
    counter: integer('counter').notNull().default(0),
    transports: text('transports').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('passkeys_user_idx').on(t.userId)],
);
