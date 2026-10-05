import { after, NextResponse } from 'next/server';
import { alertOwner } from '@/lib/alert';
import { getDb } from '@/db';
import { reportPoll } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { reportSchema } from '@/lib/validation';
import { getOrCreateVoterId } from '@/lib/voter';

// "Report this duel": one report per person per duel. Enough reports take an unreviewed duel down at once.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`report:${clientIp(req)}`, 10, 60 * 60_000))) {
    return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  }
  const { id } = await params;
  const parsed = reportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Pick a reason.' }, { status: 400 });
  const ok = await reportPoll(await getDb(), id, await getOrCreateVoterId(), parsed.data.reason, clientIp(req));
  if (!ok) return NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
  // After the answer is sent, so a slow alert never slows the reporter down.
  const photo = parsed.data.reason === 'private' || parsed.data.reason === 'me';
  after(() => alertOwner(`Report: ${parsed.data.reason}${ok.hidden ? ' (taken down)' : ''}`, `"${ok.title}" /p/${id}. Check it on /admin.`, photo));
  return NextResponse.json({ ok: true });
}
