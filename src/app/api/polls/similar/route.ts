import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { findSimilar } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { MAX_CHOICE, MAX_TITLE } from '@/lib/limits';

// "A poll like this is already live" on Create: asked while the question is being typed (after a pause).
export async function GET(req: Request) {
  if (!(await rateLimit(`similar:${clientIp(req)}`, 60, 60_000))) return NextResponse.json({ polls: [] }, { status: 429 });
  const q = new URL(req.url).searchParams;
  const title = (q.get('q') ?? '').slice(0, MAX_TITLE);
  const choices = (q.get('c') ?? '').split('|').map((c) => c.slice(0, MAX_CHOICE)).slice(0, 10);
  const polls = await findSimilar(await getDb(), title, choices);
  return NextResponse.json({ polls: polls.map((p) => ({ id: p.id, title: p.title, votes: p.totalVotes })) }, { headers: { 'Cache-Control': 'no-store' } });
}
