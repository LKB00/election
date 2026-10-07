import { beforeAll, describe, expect, it } from 'vitest';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { eq } from 'drizzle-orm';
import { schema, type Db } from '@/db';
import { signInKey, verifyFirebaseToken } from '@/lib/firebaseAuth';

// Google / phone-number sign-in: Firebase's ticket is checked, and only a scrambled id is kept.
const PROJECT = 'chunav-test';
let db: Db;
let sign: (claims: Record<string, unknown>, opts?: { iss?: string; aud?: string; exp?: string; sub?: string }) => Promise<string>;
let keys: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  process.env.PGLITE_DIR = 'memory://';
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  else delete process.env.DATABASE_URL;
  db = await (await import('@/db')).getDb();
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
  keys = createLocalJWKSet({ keys: [jwk] });
  sign = (claims, o = {}) =>
    new SignJWT({ auth_time: Math.floor(Date.now() / 1000), ...claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(o.iss ?? `https://securetoken.google.com/${PROJECT}`)
      .setAudience(o.aud ?? PROJECT)
      .setSubject(o.sub ?? 'firebase-uid-1')
      .setIssuedAt()
      .setExpirationTime(o.exp ?? '1h')
      .sign(privateKey);
});

describe('Firebase ticket check', () => {
  it('accepts a Google or phone ticket for this project', async () => {
    expect(await verifyFirebaseToken(await sign({ firebase: { sign_in_provider: 'google.com' } }), PROJECT, keys)).toEqual({ uid: 'firebase-uid-1', method: 'google' });
    expect(await verifyFirebaseToken(await sign({ firebase: { sign_in_provider: 'phone' } }), PROJECT, keys)).toEqual({ uid: 'firebase-uid-1', method: 'phone' });
  });

  it('refuses tickets for another project, from another issuer, expired, or from other sign-in kinds', async () => {
    const g = { firebase: { sign_in_provider: 'google.com' } };
    expect(await verifyFirebaseToken(await sign(g, { aud: 'other-project' }), PROJECT, keys)).toBeNull();
    expect(await verifyFirebaseToken(await sign(g, { iss: 'https://evil.example' }), PROJECT, keys)).toBeNull();
    expect(await verifyFirebaseToken(await sign(g, { exp: '-1m' }), PROJECT, keys)).toBeNull();
    expect(await verifyFirebaseToken(await sign({ firebase: { sign_in_provider: 'password' } }), PROJECT, keys)).toBeNull();
    expect(await verifyFirebaseToken(await sign({ firebase: { sign_in_provider: 'anonymous' } }), PROJECT, keys)).toBeNull();
    expect(await verifyFirebaseToken('not-a-token', PROJECT, keys)).toBeNull();
    expect(await verifyFirebaseToken(undefined, PROJECT, keys)).toBeNull();
    // Signed with a different key (someone making their own ticket).
    const { privateKey: other } = await generateKeyPair('RS256');
    const forged = await new SignJWT({ auth_time: Math.floor(Date.now() / 1000), firebase: { sign_in_provider: 'google.com' } })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setIssuer(`https://securetoken.google.com/${PROJECT}`).setAudience(PROJECT).setSubject('x').setIssuedAt().setExpirationTime('1h').sign(other);
    expect(await verifyFirebaseToken(forged, PROJECT, keys)).toBeNull();
  });
});

describe('Google / phone profiles', () => {
  it('keeps only a scrambled id, finds the same profile again, and goes with the profile', async () => {
    const { createUserWithSignIn, findSignIn, deleteProfile } = await import('@/lib/profiles');
    const key = signInKey('firebase-uid-2');
    expect(key).not.toContain('firebase-uid-2');
    expect(signInKey('firebase-uid-2')).toBe(key);
    expect(await findSignIn(db, key)).toBeNull();
    await createUserWithSignIn(db, { id: 'u-fb-1', name: 'Asha', avatar: '🦁' }, { key, method: 'phone' });
    expect(await findSignIn(db, key)).toBe('u-fb-1');
    // A second profile with the same sign-in is refused, and leaves no profile behind.
    await expect(createUserWithSignIn(db, { id: 'u-fb-2', name: 'Asha 2', avatar: '🦁' }, { key, method: 'phone' })).rejects.toThrow();
    expect(await db.select().from(schema.users).where(eq(schema.users.id, 'u-fb-2'))).toHaveLength(0);
    await deleteProfile(db, 'u-fb-1');
    expect(await findSignIn(db, key)).toBeNull();
  });
});

describe('phone numbers', () => {
  it('reads Indian numbers the way people type them, and keeps international ones', async () => {
    const { phoneE164 } = await import('@/lib/firebaseClient');
    expect(phoneE164('98765 43210')).toBe('+919876543210');
    expect(phoneE164('098765-43210')).toBe('+919876543210');
    expect(phoneE164('91 98765 43210')).toBe('+919876543210');
    expect(phoneE164('+91 98765 43210')).toBe('+919876543210');
    expect(phoneE164('+44 7700 900123')).toBe('+447700900123');
    expect(phoneE164('12345')).toBeNull();
    expect(phoneE164('abc')).toBeNull();
    expect(phoneE164('')).toBeNull();
  });
});
