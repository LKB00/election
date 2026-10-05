import { generateRegistrationOptions } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { AVATARS, newUserId, relyingParty, saveChallenge } from '@/lib/auth';
import { cleanName } from '@/lib/profiles';
import { clientIp, rateLimit } from '@/lib/rate-limit';

// Step 1 of making a profile: the phone is asked to create a passkey (fingerprint, face or screen lock) for this site.
export async function POST(req: Request) {
  if (!(await rateLimit(`auth:${clientIp(req)}`, 20, 10 * 60_000))) return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  const body = await req.json().catch(() => null);
  const name = cleanName(body?.name);
  if (!name) return NextResponse.json({ error: 'Your name needs at least 2 letters.' }, { status: 400 });
  const avatar = AVATARS.includes(body?.avatar) ? body.avatar : AVATARS[0];
  const { rpID } = await relyingParty();
  const uid = newUserId();
  const options = await generateRegistrationOptions({
    rpName: 'Election',
    rpID,
    userName: name,
    userDisplayName: name,
    userID: new TextEncoder().encode(uid),
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  });
  await saveChallenge({ challenge: options.challenge, uid, name, avatar });
  return NextResponse.json(options);
}
