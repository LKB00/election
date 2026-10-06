import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getPoll, guessLeader } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { guessSchema } from '@/lib/validation';
import { readVoterId } from '@/lib/voter';
import { countEvent } from '@/lib/events';

// "Who's winning right now?" One answer per vote (or "skip"), checked on the server.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`guess:${clientIp(req)}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  }
  const { id } = await params;
  const parsed = guessSchema.safeParse(await req.json().catch(() => null));
  const voterId = await readVoterId();
  if (!parsed.success || !voterId) return NextResponse.json({ error: 'Vote first.' }, { status: 400 });
  const db = await getDb();
  const result = await guessLeader(db, id, voterId, parsed.data.choice);
  if (result === 'not_found') return NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
  if (result === 'bad_option') return NextResponse.json({ error: 'That choice is not in this poll.' }, { status: 400 });
  if (result !== 'ok') return NextResponse.json({ error: 'You already answered this one.' }, { status: 409 });
  const via = new URL(req.url).searchParams.get('f');
  const poll = await getPoll(db, id, voterId, via);
  // The owner's step counter: was "Guess the crowd" answered or skipped? Not counted when yours was the only vote
  // (the page skips the question for you then; nobody chose anything).
  if (poll && poll.participants >= 2) await countEvent(db, parsed.data.choice === 'skip' ? 'guess_skip' : 'guess');
  return NextResponse.json({ poll });
}
