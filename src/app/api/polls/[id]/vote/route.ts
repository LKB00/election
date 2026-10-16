import { after, NextResponse } from 'next/server';
import { alertOwner } from '@/lib/alert';
import { checkFlow, recordFlow } from '@/lib/flood';
import { and, eq, isNull } from 'drizzle-orm';
import { currentUser } from '@/lib/auth';
import { getDb, schema } from '@/db';
import { castVote, getPoll, undoVote } from '@/lib/polls';
import { nearMilestone, pushEnabled, sendMilestone, sendResultAlerts } from '@/lib/push';
import { countSource } from '@/lib/maker';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { verifyHuman } from '@/lib/turnstile';
import { voteSchema } from '@/lib/validation';
import { ERR } from '@/lib/limits';
import { countEvent } from '@/lib/events';
import { getOrCreateVoterId, readVoterId } from '@/lib/voter';

const MESSAGES = {
  already_voted: 'You already voted in this poll.',
  closed: 'This poll has ended.',
  not_found: 'We could not find this poll. It may have been removed.',
  bad_option: 'That choice is not in this poll.',
  bad_other: ERR.otherBad,
  frozen: 'Voting on this poll is paused for a few minutes: we saw unusual activity. Results are still open.',
  ideas: 'People are still adding ideas. Voting opens soon.',
  not_started: 'This poll opens later.',
  busy: 'Too many votes from your internet connection just now. Try again in a few minutes.',
} as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`vote:${clientIp(req)}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  }
  const { id } = await params;
  const parsed = voteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Pick a choice.' }, { status: 400 });
  if (!(await verifyHuman(parsed.data.human, req))) {
    return NextResponse.json({ error: 'We couldn’t check you’re not a robot. Reload the page and try again.' }, { status: 403 });
  }

  const db = await getDb();
  const voterId = await getOrCreateVoterId();
  // Flood guard (src/lib/flood.ts): a paused poll, or too many votes from one network on it just now.
  const net = clientIp(req);
  const [meta] = await db.select({ category: schema.polls.category, title: schema.polls.title, ownerId: schema.polls.ownerId, makerVoter: schema.polls.makerVoter }).from(schema.polls).where(eq(schema.polls.id, id)).limit(1);
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
  // The maker voting on their own poll (signed in): keep their voter key, so "show my pick" can show it to voters.
  if (result === 'ok' && meta?.ownerId && !meta.makerVoter) {
    const user = await currentUser(db).catch(() => null);
    if (user?.id === meta.ownerId) await db.update(schema.polls).set({ makerVoter: voterId }).where(and(eq(schema.polls.id, id), isNull(schema.polls.makerVoter)));
  }
  // Where the vote came from, for the maker's view (a count per poll, never kept with the vote).
  if (result === 'ok') await countSource(db, id, parsed.data.src ?? 'other').catch(() => undefined);
  // The owner's step counter: a vote, and whether it came from a share link (a friend's code or a tagged link).
  if (result === 'ok') {
    await countEvent(db, 'vote');
    if (parsed.data.via || (parsed.data.src && parsed.data.src !== 'other')) await countEvent(db, 'shared_vote');
  }
  const view = await getPoll(db, id, voterId, parsed.data.via);
  // The maker asked to hear at 10, 50, 100… votes. "Near", not "exactly": two votes at once can go from 9 to 11. The
  // sender marks each milestone per phone, so each still goes out once.
  const total = view?.participants ?? 0;
  if (result === 'ok' && nearMilestone(total) && pushEnabled()) after(() => sendMilestone(db, id, total).then(() => undefined));
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
