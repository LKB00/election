import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { CIRCLE_ERRORS, createCircle } from '@/lib/circles';
import { CIRCLE_NAME_MAX } from '@/lib/limits';
import { clientIp, rateLimit } from '@/lib/rate-limit';

// Start a circle (docs/DESIGN.md, "Circles"). Needs a profile: a circle is a group of profiles.
const body = z.object({ name: z.string().max(CIRCLE_NAME_MAX * 2), emoji: z.string().max(16) });

export async function POST(req: Request) {
  const db = await getDb();
  const user = await currentUser(db);
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!(await rateLimit(`circle:${clientIp(req)}`, 10, 60 * 60_000))) {
    return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: CIRCLE_ERRORS.name[0] }, { status: 400 });
  const r = await createCircle(db, user.id, parsed.data.name, parsed.data.emoji);
  if (!r.ok) return NextResponse.json({ error: CIRCLE_ERRORS[r.error][0] }, { status: CIRCLE_ERRORS[r.error][1] });
  return NextResponse.json({ id: r.id }, { status: 201 });
}
