import { createHmac } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { appSecret } from './secret';

// Google and phone-number sign-in (owner, Oct 2026: "add login with phone number and Google"). Google's Firebase does
// the hard part on the phone (the Google window, the SMS code) and hands back a signed ticket (an "ID token"). Here we
// check that ticket with Google's public keys, then keep only a scrambled form of its user id: never the email or the
// phone number. Off until the owner adds the Firebase keys (docs/OWNER_TODO.md).

export type SignInMethod = 'google' | 'phone';
const METHODS: Record<string, SignInMethod> = { 'google.com': 'google', phone: 'phone' };

/** The Firebase project, when Google/phone sign-in is switched on. */
export const firebaseProject = () => process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || null;

let googleKeys: JWTVerifyGetKey | null = null;
const remoteKeys = () =>
  (googleKeys ??= createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')));

/** Checks a Firebase ID token for this project. `keys` is for tests; the site uses Google's published keys. */
export async function verifyFirebaseToken(token: unknown, project: string, keys: JWTVerifyGetKey = remoteKeys()): Promise<{ uid: string; method: SignInMethod } | null> {
  if (typeof token !== 'string' || token.length > 4096) return null;
  try {
    const { payload } = await jwtVerify(token, keys, { issuer: `https://securetoken.google.com/${project}`, audience: project, algorithms: ['RS256'] });
    const uid = typeof payload.sub === 'string' ? payload.sub : '';
    const method = METHODS[String((payload.firebase as { sign_in_provider?: unknown } | undefined)?.sign_in_provider)];
    const authTime = Number(payload.auth_time);
    if (!uid || uid.length > 128 || !method || !(authTime <= Date.now() / 1000 + 60)) return null;
    return { uid, method };
  } catch {
    return null;
  }
}

/** The scrambled key stored for a Firebase user id (the same person always gets the same key). */
export const signInKey = (uid: string) => createHmac('sha256', appSecret()).update(`firebase:${uid}`).digest('base64url');
