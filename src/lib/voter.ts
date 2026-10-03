import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'voter';
const secret = () => {
  const s = process.env.VOTER_SECRET;
  if (s && s.length >= 16) return s;
  // A weak secret would let people forge voter ids and vote many times.
  if (process.env.NODE_ENV === 'production') throw new Error('VOTER_SECRET must be set (16+ characters).');
  return 'dev-only-secret';
};
const sign = (id: string) => createHmac('sha256', secret()).update(id).digest('base64url').slice(0, 22);

function verify(raw: string | undefined): string | null {
  if (!raw) return null;
  const [id, sig] = raw.split('.');
  if (!id || !sig) return null;
  const want = Buffer.from(sign(id));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}

/** Reads the voter id from a signed cookie. Does not create one. */
export async function readVoterId(): Promise<string | null> {
  return verify((await cookies()).get(COOKIE)?.value);
}

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 365 * 2,
};

/** Reads the voter id, or creates a new one and sets the cookie (route handlers only). */
export async function getOrCreateVoterId(): Promise<string> {
  const existing = await readVoterId();
  if (existing) return existing;
  const id = randomBytes(12).toString('base64url');
  (await cookies()).set(COOKIE, `${id}.${sign(id)}`, COOKIE_OPTS);
  return id;
}

/** The signed voter key itself, for the private "keep my votes" link. Null when this phone has not voted yet. */
export async function voterKeyForLink(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  return verify(raw) ? raw! : null;
}

/** Opening a "keep my votes" link: this phone becomes that voter (route handlers only). False if the link was changed. */
export async function adoptVoterKey(raw: string | null): Promise<boolean> {
  if (!raw || !verify(raw)) return false;
  (await cookies()).set(COOKIE, raw, COOKIE_OPTS);
  return true;
}

/** After "delete my votes": forget this voter on this phone (route handlers only). */
export async function forgetVoter() {
  (await cookies()).delete(COOKIE);
}
