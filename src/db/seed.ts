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
      title: 'Who would you pick?',
      description: 'A fun head-to-head. Not an official or scientific poll.',
      category: 'politics',
      hideUntilVoted: true,
      allowChange: false,
      reasons: JSON.stringify(FLAGSHIP_REASONS),
      featured: true,
    })
    .onConflictDoNothing();
  await db
    .insert(schema.options)
    .values([
      // Photos live in public/candidates/. If a file is missing the screen shows the initials instead.
      { id: 'modi', pollId: FLAGSHIP_ID, label: 'Narendra Modi', imageUrl: '/candidates/modi.jpg', position: 0 },
      { id: 'rahul', pollId: FLAGSHIP_ID, label: 'Rahul Gandhi', imageUrl: '/candidates/rahul.jpg', position: 1 },
    ])
    .onConflictDoUpdate({ target: schema.options.id, set: { imageUrl: sql`coalesce(${schema.options.imageUrl}, excluded.image_url)` } });
}
