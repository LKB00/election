import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminKey } from '@/lib/admin';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { setVerified } from '@/lib/verify';

// The owner verifies a profile (or takes the badge away) from /admin.
export async function POST(req: Request) {
  if (!(await rateLimit(`admin:${clientIp(req)}`, 60, 60_000))) return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  const body = await req.json().catch(() => null);
  if (!isAdminKey(String(body?.key ?? ''))) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  const who = await setVerified(await getDb(), String(body?.who ?? '').slice(0, 300), body?.on !== false);
  if (!who) return NextResponse.json({ error: 'No profile found for that link.' }, { status: 404 });
  return NextResponse.json({ ok: true, ...who });
}
