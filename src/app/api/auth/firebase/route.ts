import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { AVATARS, newUserId, startSession } from '@/lib/auth';
import { firebaseProject, signInKey, verifyFirebaseToken } from '@/lib/firebaseAuth';
import { cleanName, createUserWithSignIn, findSignIn } from '@/lib/profiles';
import { clientIp, rateLimit } from '@/lib/rate-limit';

// Google or phone-number sign-in (src/lib/firebaseAuth.ts). The phone sends Firebase's ticket; a known sign-in opens its
// profile, a new one makes a profile with the name and face picked on the screen (or asks for them: { needName }).
export async function POST(req: Request) {
  if (!(await rateLimit(`auth:${clientIp(req)}`, 20, 10 * 60_000))) return NextResponse.json({ error: 'Too many taps. Wait a few seconds and try again.' }, { status: 429 });
  const project = firebaseProject();
  const body = await req.json().catch(() => null);
  const who = project ? await verifyFirebaseToken(body?.token, project) : null;
  if (!who) return NextResponse.json({ error: 'Could not sign you in. Try again.' }, { status: 400 });
  const db = await getDb();
  const key = signInKey(who.uid);
  const existing = await findSignIn(db, key);
  if (existing) {
    await startSession(existing);
    return NextResponse.json({ ok: true });
  }
  const name = cleanName(body?.name);
  if (!name) return NextResponse.json({ needName: true });
  const avatar = AVATARS.includes(body?.avatar) ? body.avatar : AVATARS[0];
  const uid = newUserId();
  try {
    await createUserWithSignIn(db, { id: uid, name, avatar }, { key, method: who.method });
  } catch {
    // Two taps at once: the other one made the profile. Sign in to it.
    const again = await findSignIn(db, key);
    if (!again) return NextResponse.json({ error: 'Could not save your profile. Try again.' }, { status: 400 });
    await startSession(again);
    return NextResponse.json({ ok: true });
  }
  await startSession(uid);
  return NextResponse.json({ ok: true });
}
