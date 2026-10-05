import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { createPack } from '@/lib/packs';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createPollSchema, packSchema } from '@/lib/validation';

// A match-day or show-night pack: its polls are checked one by one with the same rules as any poll.
export async function POST(req: Request) {
  // Making a poll needs a profile (voting never does): every poll is made by a person.
  const db = await getDb();
  const user = await currentUser(db);
  if (!user) return NextResponse.json({ error: 'Sign in to make a poll.' }, { status: 401 });
  if (!(await rateLimit(`create:${clientIp(req)}`, 10, 60 * 60_000))) {
    return NextResponse.json({ error: 'You have started a lot of polls. Try again in an hour.' }, { status: 429 });
  }
  const parsed = packSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid poll' }, { status: 400 });
  const items = [];
  for (const raw of parsed.data.polls) {
    const p = createPollSchema.safeParse(raw);
    if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? 'Invalid poll' }, { status: 400 });
    // No photos in packs: a pack is about a moment, and photos would wait for review.
    items.push({ ...p.data, photos: [], photoConsent: false });
  }
  const manageKey = randomBytes(18).toString('base64url');
  const { id, pollIds } = await createPack(db, parsed.data, items, manageKey, user.id);
  return NextResponse.json({ id, pollIds, manageKey }, { status: 201 });
}
