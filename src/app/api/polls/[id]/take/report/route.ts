import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db';
import { reportTake } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { readVoterId } from '@/lib/voter';

// Report someone's line: enough reports hide it (TAKE_REPORTS_HIDE).
const body = z.object({ id: z.string().min(1).max(40) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`take-report:${clientIp(req)}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  }
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  const voterId = await readVoterId();
  if (!parsed.success || !voterId) return NextResponse.json({ error: 'Could not send that report. Try again.' }, { status: 400 });
  if (!(await reportTake(await getDb(), id, parsed.data.id, voterId))) {
    return NextResponse.json({ error: 'Could not send that report. Try again.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
