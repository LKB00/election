import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { createBattle } from '@/lib/battles';
import { namesPolitics } from '@/lib/moderation';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { battleSchema } from '@/lib/validation';

// A knockout battle (docs/DESIGN.md, "Knockout battles"): made by a person with a profile, like any poll.
export async function POST(req: Request) {
  const db = await getDb();
  const user = await currentUser(db);
  if (!user) return NextResponse.json({ error: 'Sign in to make a poll.' }, { status: 401 });
  if (!(await rateLimit(`create:${clientIp(req)}`, 10, 60 * 60_000))) return NextResponse.json({ error: 'You’ve made a lot of polls. Try again in an hour.' }, { status: 429 });
  const parsed = battleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Something in your poll isn’t right. Check it and try again.' }, { status: 400 });
  // Politicians head to head round after round is an election by another name: not as a battle.
  if (namesPolitics(parsed.data.title, ...parsed.data.entrants.map((e) => e.label))) return NextResponse.json({ error: 'Knockout battles can’t be about politics. Make a normal poll instead.' }, { status: 400 });
  const id = await createBattle(db, parsed.data, user.id);
  return NextResponse.json({ id }, { status: 201 });
}
