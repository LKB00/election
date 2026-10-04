import type { Db } from '.';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

export const FLAGSHIP_ID = 'modi-vs-rahul';

export const FLAGSHIP_REASONS = ['Leadership', 'Vision', 'Honesty', 'Experience', 'Connects with people', 'Fresh ideas'];

/** The flagship poll. Safe to run on every start: it only inserts when missing. */
export async function seedFlagship(db: Db) {
  await db
    .insert(schema.polls)
    .values({
      id: FLAGSHIP_ID,
      title: 'Modi or Rahul?',
      description: 'Pick one. See where everyone stands.',
      category: 'politics',
      hideUntilVoted: true,
      allowChange: false,
      reasons: JSON.stringify(FLAGSHIP_REASONS),
      featured: true,
      reviewed: true,
      electionMode: true,
    })
    // Featured is the owner's choice after the first start ("Today's question" on /admin), so it is not reset here.
    .onConflictDoUpdate({ target: schema.polls.id, set: { title: 'Modi or Rahul?', description: 'Pick one. See where everyone stands.', electionMode: true } });
  await db
    .insert(schema.options)
    .values([
      // Photos live in public/candidates/. If a file is missing the screen shows the initials instead.
      { id: 'modi', pollId: FLAGSHIP_ID, label: 'Narendra Modi', subtitle: 'BJP', imageUrl: '/candidates/modi.jpg', imageCredit: "Prime Minister's Office (GODL-India)", position: 0 },
      { id: 'rahul', pollId: FLAGSHIP_ID, label: 'Rahul Gandhi', subtitle: 'INC', imageUrl: '/candidates/rahul.jpg', imageCredit: 'Himanshu Arya Khowal, CC BY 4.0', position: 1 },
    ])
    .onConflictDoUpdate({ target: schema.options.id, set: {
        imageUrl: sql`coalesce(${schema.options.imageUrl}, excluded.image_url)`,
        subtitle: sql`excluded.subtitle`,
        imageCredit: sql`excluded.image_credit`,
      } });
  await seedStarters(db);
}

// Duels timed to what India talks about next (the 2027 state elections, IPL), plus two easy ones.
// Inserted once; after that the owner can hide or edit them like any duel.
const STARTERS: { id: string; title: string; category: string; options: string[] }[] = [
  { id: 'virat-rohit-dhoni', title: 'Virat, Rohit or Dhoni?', category: 'cricket', options: ['Virat Kohli', 'Rohit Sharma', 'MS Dhoni'] },
  {
    id: 'ipl-2027-winner',
    title: 'Who wins IPL 2027?',
    category: 'cricket',
    options: ['Chennai Super Kings', 'Mumbai Indians', 'Royal Challengers Bengaluru', 'Kolkata Knight Riders', 'Sunrisers Hyderabad', 'Delhi Capitals', 'Rajasthan Royals', 'Punjab Kings', 'Gujarat Titans', 'Lucknow Super Giants'],
  },
  { id: 'up-2027', title: 'UP 2027: who wins?', category: 'politics', options: ['BJP', 'SP', 'BSP', 'INC'] },
  { id: 'chai-or-coffee', title: 'Chai or coffee?', category: 'food', options: ['Chai', 'Coffee'] },
];

export async function seedStarters(db: Db) {
  for (const s of STARTERS) {
    const added = await db
      .insert(schema.polls)
      .values({ id: s.id, title: s.title, category: s.category, hideUntilVoted: true, reviewed: true })
      .onConflictDoNothing()
      .returning({ id: schema.polls.id });
    if (!added.length) continue;
    await db
      .insert(schema.options)
      .values(s.options.map((label, position) => ({ id: `${s.id}-${position + 1}`, pollId: s.id, label, position })))
      .onConflictDoNothing();
  }
}
