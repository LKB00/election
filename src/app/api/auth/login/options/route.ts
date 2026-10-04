import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { relyingParty, saveChallenge } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';

// Signing in: the phone offers the passkey it saved for this site.
export async function POST(req: Request) {
  if (!(await rateLimit(`auth:${clientIp(req)}`, 30, 10 * 60_000))) return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  const { rpID } = await relyingParty();
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred' });
  await saveChallenge({ challenge: options.challenge });
  return NextResponse.json(options);
}
