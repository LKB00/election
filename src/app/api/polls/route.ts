import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { currentUser } from '@/lib/auth';
import { isMember } from '@/lib/circles';
import { createPoll } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createPollSchema } from '@/lib/validation';
import { countEvent } from '@/lib/events';
import { readVoterId } from '@/lib/voter';

export async function POST(req: Request) {
  // Making a poll needs a profile (voting never does): every poll is made by a person.
  const db = await getDb();
  const user = await currentUser(db);
  if (!user) return NextResponse.json({ error: 'Sign in to make a poll.' }, { status: 401 });
  if (!(await rateLimit(`create:${clientIp(req)}`, 10, 60 * 60_000))) {
    return NextResponse.json({ error: 'You’ve made a lot of polls. Try again in an hour.' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createPollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Something in your poll isn’t right. Check it and try again.' }, { status: 400 });
  }
  // The creator's private key: stays on their phone and lets them mark a "Called it" result later.
  const manageKey = randomBytes(18).toString('base64url');
  // "Ask again" only links an earlier poll by the same person.
  const input = parsed.data;
  if (input.previousId) {
    const [prev] = await db.select({ ownerId: schema.polls.ownerId }).from(schema.polls).where(eq(schema.polls.id, input.previousId)).limit(1);
    if (prev?.ownerId !== user.id) input.previousId = undefined;
  }
  // A circle's poll (docs/DESIGN.md, "Circles"): only a member may post into it; it stays out of public lists.
  const circleId = typeof body?.circleId === 'string' ? body.circleId : undefined;
  if (circleId && !(await isMember(db, circleId, user.id))) return NextResponse.json({ error: 'You are not in this circle.' }, { status: 403 });
  const id = await createPoll(db, input, manageKey, undefined, user.id, { circleId });
  // The owner's step counter: a poll made, and whether its maker had voted before (a voter who became a maker).
  await countEvent(db, 'poll_created');
  // Which of the "more people asking" paths it came from (the yellow Ask card, "Ask your own version").
  if (body?.via === 'ask') await countEvent(db, 'ask_posted');
  if (input.remixOf) {
    const [made] = await db.select({ r: schema.polls.remixOf }).from(schema.polls).where(eq(schema.polls.id, id)).limit(1);
    if (made?.r) await countEvent(db, 'remix_posted');
  }
  const voter = await readVoterId();
  if (voter) {
    const [had] = await db.select({ id: schema.votes.id }).from(schema.votes).where(eq(schema.votes.voterKey, voter)).limit(1);
    if (had) await countEvent(db, 'voter_created');
  }
  return NextResponse.json({ id, manageKey }, { status: 201 });
}
