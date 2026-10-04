import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getVoterStats } from '@/lib/polls';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { adoptVoterKey, readVoterId, voterIdFromKey } from '@/lib/voter';

// The private "keep my votes" link: opening it on a new phone brings that voter's record back.
// If this phone already has its own votes, nothing changes without a tap: /me asks first (a link sent by someone else
// must not silently swap a person's votes for theirs).
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!(await rateLimit(`restore:${clientIp(req)}`, 10, 60 * 60_000))) return NextResponse.redirect(new URL('/me', url.origin));
  const k = url.searchParams.get('k');
  const incoming = voterIdFromKey(k);
  if (!incoming) return NextResponse.redirect(new URL('/me', url.origin));
  const current = await readVoterId();
  if (current && current !== incoming && (await getVoterStats(await getDb(), current)).votes > 0) {
    return NextResponse.redirect(new URL(`/me?swap=${encodeURIComponent(k!)}`, url.origin));
  }
  await adoptVoterKey(k);
  return NextResponse.redirect(new URL('/me?restored=1', url.origin));
}

// "Use the votes from the link" on /me (a form, so it only happens on a real tap on this site).
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!(await rateLimit(`restore:${clientIp(req)}`, 10, 60 * 60_000))) return NextResponse.redirect(new URL('/me', url.origin), 303);
  const form = await req.formData().catch(() => null);
  const ok = await adoptVoterKey(String(form?.get('k') ?? ''));
  return NextResponse.redirect(new URL(ok ? '/me?restored=1' : '/me', url.origin), 303);
}
