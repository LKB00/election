import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { createPoll } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createPollSchema } from '@/lib/validation';

export async function POST(req: Request) {
  // Making a poll needs a profile (voting never does): every poll is made by a person.
  const db = await getDb();
  const user = await currentUser(db);
  if (!user) return NextResponse.json({ error: 'Sign in to make a poll.' }, { status: 401 });
  if (!(await rateLimit(`create:${clientIp(req)}`, 10, 60 * 60_000))) {
    return NextResponse.json({ error: 'Too many polls. Try again later.' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createPollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid poll' }, { status: 400 });
  }
  // The creator's private key: stays on their phone and lets them mark a "Called it" result later.
  const manageKey = randomBytes(18).toString('base64url');
  const id = await createPoll(db, parsed.data, manageKey, undefined, user.id);
  return NextResponse.json({ id, manageKey }, { status: 201 });
}
