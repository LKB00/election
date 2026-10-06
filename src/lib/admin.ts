import { createHash, timingSafeEqual } from 'node:crypto';

// The owner's review page is switched off until ADMIN_SECRET (16+ characters) is set.
export function isAdminKey(key: string | null | undefined): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 16 || !key) return false;
  const a = createHash('sha256').update(secret).digest();
  const b = createHash('sha256').update(key).digest();
  return timingSafeEqual(a, b);
}

/** Same-time compare of two secrets (so the time taken never hints how much of a guess was right). */
export function sameSecret(given: string | null | undefined, secret: string): boolean {
  if (!given) return false;
  return timingSafeEqual(createHash('sha256').update(given).digest(), createHash('sha256').update(secret).digest());
}
