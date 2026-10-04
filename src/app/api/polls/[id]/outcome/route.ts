import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { setOutcome } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { outcomeSchema } from '@/lib/validation';

// "Called it": the creator (or the owner) marks the choice that came true.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`outcome:${clientIp(req)}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }
  const parsed = outcomeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Pick a choice.' }, { status: 400 });
  const { id } = await params;
  const r = await setOutcome(await getDb(), id, parsed.data.optionId, parsed.data.key);
  if (r === 'ok' || r === 'done') return NextResponse.json({ ok: true });
  if (r === 'not_allowed') return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  if (r === 'bad_option') return NextResponse.json({ error: 'That choice is not in this poll.' }, { status: 400 });
  return NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
}
