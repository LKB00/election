import { desc, gte, sql } from 'drizzle-orm';
import { schema, type Db } from '@/db';
import { INDIA_TZ } from './time';

// The owner's step counter (owner, Oct 2026, after the product audit: "instrument the create → share → vote loop").
// Each step is one number per India day; nothing about who did it or on which poll. Shown on /admin.
//   home_view        Home opened                      poll_view     a poll opened
//   shared_open      a poll opened from a share link  vote          a vote saved
//   shared_vote      a vote that came from a share link
//   share_open       the Share panel opened           whatsapp      WhatsApp chosen in it
//   copy_link        a link copied                    create_open   Start a poll opened
//   poll_created     a poll made                      voter_created a poll made by someone who has voted before
//   create_after_vote  "Have a question of your own?" tapped after voting
export const EVENTS = ['home_view', 'poll_view', 'shared_open', 'vote', 'shared_vote', 'share_open', 'whatsapp', 'copy_link', 'create_open', 'create_after_vote', 'poll_created', 'voter_created'] as const;
export type StepEvent = (typeof EVENTS)[number];
/** The steps a page may report itself (the rest are counted by the server, where they cannot be faked). */
export const CLIENT_EVENTS: readonly StepEvent[] = ['home_view', 'poll_view', 'shared_open', 'share_open', 'whatsapp', 'copy_link', 'create_open', 'create_after_vote'];
/** How many days the admin table shows. */
export const STEP_DAYS = 7;

export const indiaDate = (now = new Date()) => now.toLocaleDateString('en-CA', { timeZone: INDIA_TZ });

/** Adds one to today's count of a step. Never throws: counting must not break voting or making a poll. */
export async function countEvent(db: Db, event: StepEvent): Promise<void> {
  try {
    await db
      .insert(schema.dailyEvents)
      .values({ day: indiaDate(), event, n: 1 })
      .onConflictDoUpdate({ target: [schema.dailyEvents.day, schema.dailyEvents.event], set: { n: sql`${schema.dailyEvents.n} + 1` } });
  } catch {
    /* counting is best effort */
  }
}

/** The last STEP_DAYS days, newest first: one row per day with every step's count (0 when nothing happened). */
export async function stepTable(db: Db, now = new Date()): Promise<{ day: string; n: Record<StepEvent, number> }[]> {
  const days = Array.from({ length: STEP_DAYS }, (_, k) => indiaDate(new Date(now.getTime() - k * 86_400_000)));
  const rows = await db.select().from(schema.dailyEvents).where(gte(schema.dailyEvents.day, days.at(-1)!)).orderBy(desc(schema.dailyEvents.day));
  return days.map((day) => ({
    day,
    n: Object.fromEntries(EVENTS.map((e) => [e, rows.find((r) => r.day === day && r.event === e)?.n ?? 0])) as Record<StepEvent, number>,
  }));
}
