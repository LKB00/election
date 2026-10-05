import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { suggest } from '@/lib/maker';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { suggestSchema } from '@/lib/validation';

// "Suggest a choice": waits for the poll maker, who adds it or not. Nobody else sees it until then.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`suggest:${clientIp(req)}`, 5, 10 * 60_000))) return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  const { id } = await params;
  const parsed = suggestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'One choice is empty. Fill it in or remove it.' }, { status: 400 });
  const r = await suggest(await getDb(), id, parsed.data.label);
  if (r === 'not_found') return NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
  if (r === 'off') return NextResponse.json({ error: 'This poll has ended.' }, { status: 409 });
  if (r === 'full') return NextResponse.json({ error: 'You can have up to 10 choices. Remove one to continue.' }, { status: 409 });
  return NextResponse.json({ ok: true, exists: r === 'exists' });
}
