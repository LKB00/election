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
    })
    .onConflictDoUpdate({ target: schema.polls.id, set: { title: 'Modi or Rahul?', description: 'Pick one. See where everyone stands.' } });
  await db
    .insert(schema.options)
    .values([
      // Photos live in public/candidates/. If a file is missing the screen shows the initials instead.
      { id: 'modi', pollId: FLAGSHIP_ID, label: 'Narendra Modi', subtitle: 'BJP · Prime Minister', imageUrl: '/candidates/modi.jpg', imageCredit: "Prime Minister's Office (GODL-India)", position: 0 },
      { id: 'rahul', pollId: FLAGSHIP_ID, label: 'Rahul Gandhi', subtitle: 'INC · Leader of Opposition', imageUrl: '/candidates/rahul.jpg', imageCredit: 'Himanshu Arya Khowal, CC BY 4.0', position: 1 },
    ])
    .onConflictDoUpdate({ target: schema.options.id, set: {
        imageUrl: sql`coalesce(${schema.options.imageUrl}, excluded.image_url)`,
        subtitle: sql`excluded.subtitle`,
        imageCredit: sql`excluded.image_credit`,
      } });
}
