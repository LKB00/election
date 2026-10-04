import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminKey } from '@/lib/admin';
import { resumeVoting } from '@/lib/flood';
import { planToday, setPollFlags, setToday } from '@/lib/polls';
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
  if (parsed.data.action === 'today') {
    return (await setToday(await getDb(), id, parsed.data.closeTonight ?? false)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
  }
  if (parsed.data.action === 'plan') {
    return (await planToday(await getDb(), id, parsed.data.day ?? null)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Pick today or a later day.' }, { status: 400 });
  }
  if (parsed.data.action === 'resume') {
    return (await resumeVoting(await getDb(), id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
  }
  // "Show again" means the owner looked at it: it counts as reviewed, so the next single report cannot hide it again.
  const flags = parsed.data.action === 'hide' ? { hidden: true } : { hidden: false, reviewed: true };
  const db = await getDb();
  const ok = await setPollFlags(db, id, flags);
  // Approving a paused poll means the owner looked at the flood and it is fine.
  if (ok && parsed.data.action === 'approve') await resumeVoting(db, id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
}
