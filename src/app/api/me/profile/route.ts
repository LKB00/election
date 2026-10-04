import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { AVATARS, currentUser, endSession } from '@/lib/auth';
import { cleanName, deleteProfile, updateProfile } from '@/lib/profiles';

// Who is signed in on this phone (null when nobody is), for the client parts (Create's sign-in step).
export async function GET() {
  return NextResponse.json({ user: await currentUser(await getDb()) });
}

// Change your name or avatar.
export async function PATCH(req: Request) {
  const db = await getDb();
  const user = await currentUser(db);
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const name = body?.name === undefined ? undefined : cleanName(body.name);
  if (name === null) return NextResponse.json({ error: 'Your name needs at least 2 letters.' }, { status: 400 });
  const avatar = AVATARS.includes(body?.avatar) ? body.avatar : undefined;
  await updateProfile(db, user.id, { ...(name ? { name } : {}), ...(avatar ? { avatar } : {}) });
  return NextResponse.json({ ok: true });
}

// Delete my profile: the name, avatar and passkeys go; polls stay up with no owner. Votes were never linked to it.
export async function DELETE() {
  const db = await getDb();
  const user = await currentUser(db);
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  await deleteProfile(db, user.id);
  await endSession();
  return NextResponse.json({ ok: true });
}
