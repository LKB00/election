import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { CLIENT_EVENTS, countEvent, type StepEvent } from '@/lib/events';
import { clientIp, rateLimit } from '@/lib/rate-limit';

// POST /api/e {"e":"poll_view"}: one step for the owner's step counter (src/lib/events.ts). Only the steps a page may
// report; anything else is ignored. No cookie is read and nothing about the visitor is kept.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { e?: unknown } | null;
  const e = typeof body?.e === 'string' ? (body.e as StepEvent) : null;
  if (e && CLIENT_EVENTS.includes(e) && (await rateLimit(`step:${clientIp(req)}`, 120, 60_000))) await countEvent(await getDb(), e);
  return new NextResponse(null, { status: 204 });
}
