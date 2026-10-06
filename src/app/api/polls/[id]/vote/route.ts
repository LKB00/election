import { after, NextResponse } from 'next/server';
import { alertOwner } from '@/lib/alert';
import { checkFlow, recordFlow } from '@/lib/flood';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { castVote, getPoll, undoVote } from '@/lib/polls';
import { MILESTONE, pushEnabled, sendMilestone, sendResultAlerts } from '@/lib/push';
import { countSource } from '@/lib/maker';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { verifyHuman } from '@/lib/turnstile';
import { voteSchema } from '@/lib/validation';
import { ERR } from '@/lib/limits';
import { getOrCreateVoterId, readVoterId } from '@/lib/voter';

const MESSAGES = {
  already_voted: 'You already voted in this poll.',
  closed: 'This poll has ended.',
  not_found: 'Poll not found.',
  bad_option: 'That choice is not in this poll.',
  bad_other: ERR.otherBad,
  frozen: 'Voting on this poll is paused for a few minutes: we saw unusual activity. Results are still open.',
  busy: 'Lots of votes from your network on this poll just now. Try again in a few minutes.',
} as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`vote:${clientIp(req)}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  }
  const { id } = await params;
  const parsed = voteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Pick a choice.' }, { status: 400 });
  if (!(await verifyHuman(parsed.data.human, req))) {
    return NextResponse.json({ error: 'Could not check that you are a person. Try again.' }, { status: 403 });
  }

  const db = await getDb();
  const voterId = await getOrCreateVoterId();
  // Flood guard (src/lib/flood.ts): a paused poll, or too many votes from one network on it just now.
  const net = clientIp(req);
  const [meta] = await db.select({ category: schema.polls.category, title: schema.polls.title }).from(schema.polls).where(eq(schema.polls.id, id)).limit(1);
  if (meta) {
    const flow = await checkFlow(db, id, net, meta.category);
    if (flow !== 'ok') return NextResponse.json({ error: MESSAGES[flow], result: flow }, { status: flow === 'frozen' ? 423 : 429 });
  }
  const result = await castVote(db, id, parsed.data.optionId, voterId, parsed.data.via, parsed.data.picks ?? [], parsed.data.maybes ?? [], parsed.data.other);

  if (result !== 'ok' && result !== 'changed') {
    const status = result === 'not_found' ? 404 : result === 'already_voted' ? 409 : result === 'frozen' ? 423 : 400;
    return NextResponse.json({ error: MESSAGES[result], result }, { status });
  }
  if (meta && result === 'ok' && (await recordFlow(db, id, net, meta.category))) {
    after(() => alertOwner('Poll paused: flood of votes', `"${meta.title}" /p/${id} got a sudden flood of votes and is paused. Resume it on /admin if it looks fine.`, true));
  }
  // Where the vote came from, for the maker's view (a count per poll, never kept with the vote).
  if (result === 'ok') await countSource(db, id, parsed.data.src ?? 'other').catch(() => undefined);
  const view = await getPoll(db, id, voterId, parsed.data.via);
  // The maker asked for one alert when the first votes are in. "At least", not "exactly": two votes at once can go
  // from 9 to 11. The sender clears its list after sending, so it still goes out once.
  if (result === 'ok' && (view?.participants ?? 0) >= MILESTONE && pushEnabled()) after(() => sendMilestone(db, id).then(() => undefined));
  // A group poll just got its last vote: its results open now, so tell the people who asked.
  if (view?.groupSize && !view.groupWaiting && view.participants >= view.groupSize && result === 'ok' && pushEnabled()) after(() => sendResultAlerts(db, [id]).then(() => undefined));
  return NextResponse.json({ result, poll: view });
}

// Undo: only within a few seconds of voting (for an accidental tap).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`undo:${clientIp(req)}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  }
  const { id } = await params;
  const voterId = await readVoterId();
  const db = await getDb();
  if (!voterId || !(await undoVote(db, id, voterId))) {
    return NextResponse.json({ error: 'Too late to undo this vote.' }, { status: 409 });
  }
  return NextResponse.json({ poll: await getPoll(db, id, voterId, new URL(req.url).searchParams.get('f')) });
}
