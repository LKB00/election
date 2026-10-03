import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { deleteVoterData } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { forgetVoter, readVoterId } from '@/lib/voter';

// "Delete my votes" (privacy law: people can erase their data). Removes everything kept for this voter.
export async function POST(req: Request) {
  if (!(await rateLimit(`delete:${clientIp(req)}`, 10, 60 * 60_000))) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }
  const voterId = await readVoterId();
  const removed = voterId ? await deleteVoterData(await getDb(), voterId) : 0;
  await forgetVoter();
  return NextResponse.json({ ok: true, removed });
}
