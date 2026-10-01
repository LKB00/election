import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { castVote, getPoll } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { voteSchema } from '@/lib/validation';
import { getOrCreateVoterId } from '@/lib/voter';

const MESSAGES = {
  already_voted: 'You already voted in this poll.',
  closed: 'This poll has ended.',
  not_found: 'Poll not found.',
  bad_option: 'That choice is not in this poll.',
} as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit(`vote:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }
  const { id } = await params;
  const parsed = voteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Pick a choice.' }, { status: 400 });

  const db = await getDb();
  const voterId = await getOrCreateVoterId();
  const result = await castVote(db, id, parsed.data.optionId, voterId);

  if (result !== 'ok' && result !== 'changed') {
    const status = result === 'not_found' ? 404 : result === 'already_voted' ? 409 : 400;
    return NextResponse.json({ error: MESSAGES[result], result }, { status });
  }
  return NextResponse.json({ result, poll: await getPoll(db, id, voterId) });
}
