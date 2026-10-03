import { NextResponse } from 'next/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { adoptVoterKey } from '@/lib/voter';

// The private "keep my votes" link: opening it on a new phone brings that voter's record back.
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!(await rateLimit(`restore:${clientIp(req)}`, 10, 60 * 60_000))) return NextResponse.redirect(new URL('/me', url.origin));
  const ok = await adoptVoterKey(url.searchParams.get('k'));
  return NextResponse.redirect(new URL(ok ? '/me?restored=1' : '/me', url.origin));
}
