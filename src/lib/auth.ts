import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { schema, type Db } from '@/db';
import { appSecret } from './secret';

// Profiles (docs/DESIGN.md, "Profiles"): optional, needed only to make a poll. Signed in with a passkey; the session is
// a signed cookie. Nothing here ever touches votes: they stay with the anonymous voter cookie (src/lib/voter.ts).
const SESSION = 'el_session';
const CHALLENGE = 'el_challenge';
const DAY = 24 * 3600;

const sign = (v: string) => createHmac('sha256', appSecret()).update(`auth:${v}`).digest('base64url').slice(0, 32);
const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
const opts = (maxAge: number) => ({ httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge });

export type Profile = { id: string; name: string; avatar: string };
export { AVATARS } from './avatars';
export const newUserId = () => randomBytes(12).toString('base64url');

/** The signed-in profile, if any (server components and route handlers). */
export async function currentUser(db: Db): Promise<Profile | null> {
  const raw = (await cookies()).get(SESSION)?.value;
  if (!raw) return null;
  const [uid, exp, sig] = raw.split('.');
  if (!uid || !exp || !sig || !same(sig, sign(`${uid}.${exp}`)) || Number(exp) < Date.now() / 1000) return null;
  const [u] = await db.select({ id: schema.users.id, name: schema.users.name, avatar: schema.users.avatar }).from(schema.users).where(eq(schema.users.id, uid)).limit(1);
  return u ?? null;
}

/** Signs this phone in for 180 days (route handlers only). */
export async function startSession(uid: string) {
  const exp = Math.floor(Date.now() / 1000) + 180 * DAY;
  (await cookies()).set(SESSION, `${uid}.${exp}.${sign(`${uid}.${exp}`)}`, opts(180 * DAY));
}
export async function endSession() {
  (await cookies()).delete(SESSION);
}

/** The passkey ceremony's one-time challenge, kept for 5 minutes in a signed cookie (with the new profile's details). */
export async function saveChallenge(data: { challenge: string; uid?: string; name?: string; avatar?: string }) {
  const body = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + 5 * 60_000 })).toString('base64url');
  (await cookies()).set(CHALLENGE, `${body}.${sign(body)}`, opts(300));
}
export async function takeChallenge(): Promise<{ challenge: string; uid?: string; name?: string; avatar?: string } | null> {
  const jar = await cookies();
  const raw = jar.get(CHALLENGE)?.value;
  jar.delete(CHALLENGE);
  if (!raw) return null;
  const [body, sig] = raw.split('.');
  if (!body || !sig || !same(sig, sign(body))) return null;
  const data = JSON.parse(Buffer.from(body, 'base64url').toString());
  return data.exp > Date.now() ? data : null;
}

/** Which site the passkey belongs to: this host (the Vercel address today; a new domain later needs new passkeys). */
export async function relyingParty() {
  const h = await headers();
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost').split(',')[0].trim();
  const proto = (h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')).split(',')[0].trim();
  return { rpID: host.split(':')[0], origin: `${proto}://${host}` };
}
