import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getPoll, guessLeader } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { guessSchema } from '@/lib/validation';
import { readVoterId } from '@/lib/voter';

// "Who's winning right now?" One answer per vote (or "skip"), checked on the server.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit(`guess:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }
  const { id } = await params;
  const parsed = guessSchema.safeParse(await req.json().catch(() => null));
  const voterId = await readVoterId();
  if (!parsed.success || !voterId) return NextResponse.json({ error: 'Vote first.' }, { status: 400 });
  const db = await getDb();
  const result = await guessLeader(db, id, voterId, parsed.data.choice);
  if (result !== 'ok') return NextResponse.json({ error: 'You already answered this one.' }, { status: 409 });
  const via = new URL(req.url).searchParams.get('f');
  return NextResponse.json({ poll: await getPoll(db, id, voterId, via) });
}
