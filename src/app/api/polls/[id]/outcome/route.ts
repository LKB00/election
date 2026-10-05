import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { setOutcome } from '@/lib/polls';
import { pushEnabled, sendResultAlerts } from '@/lib/push';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { outcomeSchema } from '@/lib/validation';

// "Called it": the creator (or the owner) marks the choice that came true.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`outcome:${clientIp(req)}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  }
  const parsed = outcomeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Pick a choice.' }, { status: 400 });
  const { id } = await params;
  const db = await getDb();
  const r = await setOutcome(db, id, parsed.data.optionId, parsed.data.key);
  // The answer is in: tell the people who asked ("Tell me the result").
  if (r === 'ok' && pushEnabled()) await sendResultAlerts(db, [id]).catch(() => 0);
  if (r === 'ok' || r === 'done') return NextResponse.json({ ok: true });
  if (r === 'not_allowed') return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  if (r === 'bad_option') return NextResponse.json({ error: 'That choice is not in this poll.' }, { status: 400 });
  return NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
}
