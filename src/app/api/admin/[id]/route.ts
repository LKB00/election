import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminKey } from '@/lib/admin';
import { setPollFlags } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { adminSchema } from '@/lib/validation';

// The owner hides, shows or approves a duel from /admin.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`admin:${clientIp(req)}`, 60, 60_000))) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }
  const parsed = adminSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isAdminKey(parsed.data.key)) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  const { id } = await params;
  const flags = parsed.data.action === 'hide' ? { hidden: true } : parsed.data.action === 'show' ? { hidden: false } : { hidden: false, reviewed: true };
  const ok = await setPollFlags(await getDb(), id, flags);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
}
