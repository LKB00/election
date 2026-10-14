import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db';
import { TAKE_MAX } from '@/lib/limits';
import { getPoll, setTake } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { readVoterId } from '@/lib/voter';

// "Say why in one line" (docs/DESIGN.md, "One line"): save, replace or (empty) remove your own line.
const body = z.object({ text: z.string().max(TAKE_MAX * 2) });
const ERRORS = {
  not_found: ['Poll not found.', 404],
  not_allowed: ['Lines are off on this poll.', 400],
  not_voted: ['Vote first, then say why.', 400],
  blocked: ['Please keep it friendly. Try other words.', 400],
  bad: ['Write a few words, up to one line.', 400],
} as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`take:${clientIp(req)}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  }
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  const voterId = await readVoterId();
  if (!voterId) return NextResponse.json({ error: ERRORS.not_voted[0] }, { status: 400 });
  if (!parsed.success) return NextResponse.json({ error: ERRORS.bad[0] }, { status: 400 });
  const db = await getDb();
  const r = await setTake(db, id, voterId, parsed.data.text);
  if (r !== 'ok') return NextResponse.json({ error: ERRORS[r][0] }, { status: ERRORS[r][1] });
  return NextResponse.json({ poll: await getPoll(db, id, voterId, new URL(req.url).searchParams.get('f')) });
}
