import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { reportPoll } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { reportSchema } from '@/lib/validation';
import { getOrCreateVoterId } from '@/lib/voter';

// "Report this duel": one report per person per duel. Enough reports take an unreviewed duel down at once.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`report:${clientIp(req)}`, 10, 60 * 60_000))) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }
  const { id } = await params;
  const parsed = reportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Pick a reason.' }, { status: 400 });
  const ok = await reportPoll(await getDb(), id, await getOrCreateVoterId(), parsed.data.reason);
  if (!ok) return NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
