import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { castVote, getPoll, undoVote } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { verifyHuman } from '@/lib/turnstile';
import { voteSchema } from '@/lib/validation';
import { getOrCreateVoterId, readVoterId } from '@/lib/voter';

const MESSAGES = {
  already_voted: 'You already voted in this poll.',
  closed: 'This poll has ended.',
  not_found: 'Poll not found.',
  bad_option: 'That choice is not in this poll.',
} as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`vote:${clientIp(req)}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }
  const { id } = await params;
  const parsed = voteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Pick a choice.' }, { status: 400 });
  if (!(await verifyHuman(parsed.data.human, req))) {
    return NextResponse.json({ error: 'Could not check that you are a person. Try again.' }, { status: 403 });
  }

  const db = await getDb();
  const voterId = await getOrCreateVoterId();
  const result = await castVote(db, id, parsed.data.optionId, voterId, parsed.data.via);

  if (result !== 'ok' && result !== 'changed') {
    const status = result === 'not_found' ? 404 : result === 'already_voted' ? 409 : 400;
    return NextResponse.json({ error: MESSAGES[result], result }, { status });
  }
  return NextResponse.json({ result, poll: await getPoll(db, id, voterId, parsed.data.via) });
}

// Undo: only within a few seconds of voting (for an accidental tap).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`undo:${clientIp(req)}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }
  const { id } = await params;
  const voterId = await readVoterId();
  const db = await getDb();
  if (!voterId || !(await undoVote(db, id, voterId))) {
    return NextResponse.json({ error: 'Too late to undo this vote.' }, { status: 409 });
  }
  return NextResponse.json({ poll: await getPoll(db, id, voterId, new URL(req.url).searchParams.get('f')) });
}
