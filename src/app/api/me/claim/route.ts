import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { claimPolls } from '@/lib/profiles';
import { isCode } from '@/lib/validation';

// After signing in: polls made on this phone before (each with its private key) join the profile.
export async function POST(req: Request) {
  const db = await getDb();
  const user = await currentUser(db);
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const items = Array.isArray(body?.polls) ? body.polls.filter((p: { id?: unknown; key?: unknown }) => isCode(p?.id as string) && typeof p?.key === 'string' && (p.key as string).length < 100) : [];
  return NextResponse.json({ claimed: await claimPolls(db, user.id, items) });
}
