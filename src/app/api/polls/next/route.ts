import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/db';
import { getDeck } from '@/lib/polls';
import { FOLLOW_COOKIE, readFollowed } from '@/lib/follow';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { isCode } from '@/lib/validation';
import { readVoterId } from '@/lib/voter';

// "Next poll" for a poll page, fetched by the phone just after the page shows (the page used to load these 8 polls
// before showing anything, about half its time). Same rules as Home's list: open, not voted yet, your topics first.
export async function GET(req: Request) {
  if (!(await rateLimit(`next:${clientIp(req)}`, 60, 60_000))) return NextResponse.json({ polls: [] }, { status: 429 });
  // after = the poll on screen; skip = polls already in the deck (Home's today's set), comma separated.
  const q = new URL(req.url).searchParams;
  const skip = [q.get('after') ?? '', ...(q.get('skip') ?? '').split(',')].filter(isCode).slice(0, 30);
  const db = await getDb();
  const [voterId, jar] = await Promise.all([readVoterId(), cookies()]);
  const polls = await getDeck(db, voterId, 8, { exclude: skip, followed: readFollowed(jar.get(FOLLOW_COOKIE)?.value) });
  return NextResponse.json({ polls }, { headers: { 'Cache-Control': 'no-store' } });
}
