import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { relyingParty, startSession, takeChallenge } from '@/lib/auth';
import { bumpCounter, findPasskey } from '@/lib/profiles';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const ch = await takeChallenge();
  if (!body?.id || !ch) return NextResponse.json({ error: 'That took too long. Try again.' }, { status: 400 });
  const db = await getDb();
  const key = await findPasskey(db, String(body.id));
  if (!key) return NextResponse.json({ error: 'We could not find your profile on this phone. Try the phone you made it on, or make a new profile.' }, { status: 404 });
  const { rpID, origin } = await relyingParty();
  try {
    const v = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: { id: key.id, publicKey: new Uint8Array(Buffer.from(key.publicKey, 'base64url')), counter: key.counter, transports: (key.transports ? key.transports.split(',') : []) as AuthenticatorTransportFuture[] },
    });
    if (!v.verified) throw new Error('not verified');
    await bumpCounter(db, key.id, v.authenticationInfo.newCounter);
    await startSession(key.userId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not sign you in. Try again.' }, { status: 400 });
  }
}
