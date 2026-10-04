import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { relyingParty, startSession, takeChallenge } from '@/lib/auth';
import { createUser } from '@/lib/profiles';

// Step 2 of making a profile: check the new passkey, save the profile, sign this phone in.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const ch = await takeChallenge();
  if (!body || !ch?.uid || !ch.name) return NextResponse.json({ error: 'That took too long. Try again.' }, { status: 400 });
  const { rpID, origin } = await relyingParty();
  try {
    const v = await verifyRegistrationResponse({ response: body, expectedChallenge: ch.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false });
    if (!v.verified || !v.registrationInfo) throw new Error('not verified');
    const { credential } = v.registrationInfo;
    await createUser(await getDb(), { id: ch.uid, name: ch.name, avatar: ch.avatar ?? '🙂' }, {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      transports: credential.transports ?? [],
    });
    await startSession(ch.uid);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not save your profile. Try again.' }, { status: 400 });
  }
}
