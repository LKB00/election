import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { CIRCLE_ERRORS, joinCircle, leaveCircle, ownerAction } from '@/lib/circles';
import { clientIp, rateLimit } from '@/lib/rate-limit';

// A circle's actions: join (with the invite code), leave, and the maker's new invite link or delete.
const body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('join'), invite: z.string().min(1).max(40) }),
  z.object({ action: z.enum(['leave', 'invite', 'delete']) }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await getDb();
  const user = await currentUser(db);
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!(await rateLimit(`circle-act:${clientIp(req)}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  }
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 400 });
  const a = parsed.data;
  const r = a.action === 'join' ? await joinCircle(db, id, a.invite, user.id) : a.action === 'leave' ? await leaveCircle(db, id, user.id) : await ownerAction(db, id, user.id, a.action);
  if (!r.ok) return NextResponse.json({ error: CIRCLE_ERRORS[r.error][0] }, { status: CIRCLE_ERRORS[r.error][1] });
  return NextResponse.json({ ok: true });
}
