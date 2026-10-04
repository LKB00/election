import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db';
import { getPoll, toggleReaction } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { readVoterId } from '@/lib/voter';

const body = z.object({ emoji: z.string().min(1).max(8) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`react:${clientIp(req)}`, 60, 60_000))) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  const voterId = await readVoterId();
  if (!parsed.success || !voterId) return NextResponse.json({ error: 'Vote first, then react.' }, { status: 400 });
  const db = await getDb();
  if (!(await toggleReaction(db, id, voterId, parsed.data.emoji))) {
    return NextResponse.json({ error: 'Could not save that reaction.' }, { status: 400 });
  }
  return NextResponse.json({ poll: await getPoll(db, id, voterId, new URL(req.url).searchParams.get('f')) });
}
