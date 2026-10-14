import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { normalJoinCode, pollForJoinCode } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';

// The join form posts here (a plain GET, so it works before any script loads): a real redirect to the poll, or back
// to /join with the code and "not found" (docs/DESIGN.md, "Join with a code").
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = normalJoinCode(url.searchParams.get('code') ?? '');
  // Guessing codes one after another is slowed down.
  if (!(await rateLimit(`join:${clientIp(req)}`, 30, 60_000))) return NextResponse.redirect(new URL(`/join?code=${code}&bad=1`, req.url), 303);
  const id = code ? await pollForJoinCode(await getDb(), code) : null;
  return NextResponse.redirect(new URL(id ? `/p/${id}?src=code` : `/join?code=${code}&bad=1`, req.url), 303);
}
