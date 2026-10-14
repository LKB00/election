import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { IDEAS_PER_PERSON } from '@/lib/limits';
import { addIdea } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { suggestSchema } from '@/lib/validation';
import { getOrCreateVoterId } from '@/lib/voter';

// "Ideas first" (docs/DESIGN.md): anyone with the link adds an idea while ideas are open. It joins the list at once
// (no waiting for the maker), passes the word filter, and one person adds at most IDEAS_PER_PERSON ideas per poll.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`idea:${clientIp(req)}`, 10, 10 * 60_000))) return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  const { id } = await params;
  const parsed = suggestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'One choice is empty. Fill it in or remove it.' }, { status: 400 });
  const voter = await getOrCreateVoterId();
  if (!(await rateLimit(`idea:${voter}:${id}`, IDEAS_PER_PERSON, 30 * 86400_000))) return NextResponse.json({ error: 'You have added all the ideas you can on this poll. Thank you!' }, { status: 429 });
  const r = await addIdea(await getDb(), id, parsed.data.label);
  if (r === 'not_found') return NextResponse.json({ error: 'We could not find this poll. It may have been removed.' }, { status: 404 });
  if (r === 'closed') return NextResponse.json({ error: 'Voting has started, so new ideas are closed.' }, { status: 409 });
  if (r === 'exists') return NextResponse.json({ error: 'That idea is already on the list.' }, { status: 409 });
  if (r === 'full') return NextResponse.json({ error: 'This poll already has the most ideas it can take.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
