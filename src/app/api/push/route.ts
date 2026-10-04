import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { dropWant, isPushSub, pushEnabled, wantResult } from '@/lib/push';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { readVoterId } from '@/lib/voter';
import { isCode } from '@/lib/validation';

// "Tell me the result": this phone wants one alert when this poll's result is in (POST), or no longer (DELETE).
export async function POST(req: Request) {
  if (!pushEnabled()) return NextResponse.json({ error: 'Not available.' }, { status: 404 });
  if (!(await rateLimit(`push:${clientIp(req)}`, 30, 60_000))) return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  const body = await req.json().catch(() => null);
  const voter = await readVoterId();
  if (!voter || !isCode(body?.pollId) || !isPushSub(body?.subscription)) return NextResponse.json({ error: 'Vote first.' }, { status: 400 });
  const ok = await wantResult(await getDb(), voter, body.subscription, body.pollId, String(body.lang ?? 'en'));
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  if (!isCode(body?.pollId) || typeof body?.endpoint !== 'string') return NextResponse.json({ error: 'Pick a choice.' }, { status: 400 });
  await dropWant(await getDb(), body.endpoint, body.pollId);
  return NextResponse.json({ ok: true });
}
