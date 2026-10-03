import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db';
import { getPoll, setReason } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { readVoterId } from '@/lib/voter';

const body = z.object({ reason: z.string().min(1).max(60) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`reason:${clientIp(req)}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  const voterId = await readVoterId();
  if (!parsed.success || !voterId) return NextResponse.json({ error: 'Vote first, then pick a reason.' }, { status: 400 });

  const db = await getDb();
  if (!(await setReason(db, id, voterId, parsed.data.reason))) {
    return NextResponse.json({ error: 'Could not save that reason.' }, { status: 400 });
  }
  return NextResponse.json({ poll: await getPoll(db, id, voterId) });
}
