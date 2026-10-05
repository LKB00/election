import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { decideSuggestion, editPoll, markOutcome, ownPoll, setEnd } from '@/lib/maker';
import { isPushSub, pushEnabled, sendResultAlerts, wantMilestone } from '@/lib/push';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { editPollSchema, isCode } from '@/lib/validation';
import { getOrCreateVoterId } from '@/lib/voter';

// Poll maker tools (only the profile that made the poll): end now, a new length, fix a typo before the first vote,
// add or delete a suggested choice, and the one "first votes are in" alert.
const HOURS = { hour: 1, day: 24, days3: 72, week: 168 } as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`manage:${clientIp(req)}`, 30, 60_000))) return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  const { id } = await params;
  const db = await getDb();
  const user = await currentUser(db);
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!(await ownPoll(db, id, user.id))) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? '');

  if (action === 'end' || action === 'length') {
    let at = new Date();
    if (action === 'length') {
      if (body?.length === 'tonight') {
        // 9 pm India time today (or tomorrow, if it is already past 9 pm).
        const now = new Date();
        const ist = new Date(now.getTime() + 330 * 60_000);
        at = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 21, 0) - 330 * 60_000);
        if (at.getTime() <= now.getTime() + 10 * 60_000) at = new Date(at.getTime() + 86_400_000);
      } else if (body?.length in HOURS) at = new Date(Date.now() + HOURS[body.length as keyof typeof HOURS] * 3_600_000);
      else return NextResponse.json({ error: 'Pick a choice.' }, { status: 400 });
    }
    const r = await setEnd(db, id, user.id, at);
    if (r === 'closed') return NextResponse.json({ error: 'This poll has ended.' }, { status: 409 });
    // Ended now: tell the people who asked for the result.
    if (action === 'end' && pushEnabled()) await sendResultAlerts(db, [id]).catch(() => 0);
    return NextResponse.json({ ok: true });
  }
  if (action === 'edit') {
    const parsed = editPollSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Pick a choice.' }, { status: 400 });
    const r = await editPoll(db, id, user.id, parsed.data);
    if (r === 'voted') return NextResponse.json({ error: 'Someone has voted, so the poll can no longer change.' }, { status: 409 });
    if (r !== 'ok') return NextResponse.json({ error: 'That choice is not in this poll.' }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (action === 'add' || action === 'drop') {
    if (!isCode(body?.sid)) return NextResponse.json({ error: 'Pick a choice.' }, { status: 400 });
    const r = await decideSuggestion(db, id, user.id, body.sid, action === 'add');
    if (r === 'full') return NextResponse.json({ error: 'You can have up to 10 choices. Remove one to continue.' }, { status: 409 });
    return NextResponse.json({ ok: true });
  }
  if (action === 'outcome') {
    if (!isCode(body?.optionId)) return NextResponse.json({ error: 'Pick a choice.' }, { status: 400 });
    const r = await markOutcome(db, id, user.id, body.optionId);
    if (r === 'bad_option') return NextResponse.json({ error: 'That choice is not in this poll.' }, { status: 400 });
    // The answer is in: tell the people who asked for the result.
    if (r === 'ok' && pushEnabled()) await sendResultAlerts(db, [id]).catch(() => 0);
    return NextResponse.json({ ok: true });
  }
  if (action === 'alert') {
    if (!pushEnabled() || !isPushSub(body?.subscription)) return NextResponse.json({ error: 'Not available.' }, { status: 404 });
    await wantMilestone(db, await getOrCreateVoterId(), body.subscription, id, String(body.lang ?? 'en'));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Pick a choice.' }, { status: 400 });
}
