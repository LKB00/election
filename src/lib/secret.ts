import { createHmac, timingSafeEqual } from 'node:crypto';

/** The server's signing secret (VOTER_SECRET): signs voter cookies and open share links. */
export const appSecret = () => {
  const s = process.env.VOTER_SECRET;
  if (s && s.length >= 16) return s;
  // A weak secret would let people forge voter ids and vote many times.
  if (process.env.NODE_ENV === 'production') throw new Error('VOTER_SECRET must be set (16+ characters).');
  return 'dev-only-secret';
};

// A share link shows the sender's pick only when it carries this proof (?o=). Only the sender gets it, and only for
// an open link: a "secret ballot" link has no proof, so deleting &s=1 from it reveals nothing.
export const shareProof = (code: string) => createHmac('sha256', appSecret()).update(`open:${code}`).digest('base64url').slice(0, 12);
export function isShareProof(code: string | null, proof: string | null): boolean {
  if (!code || !proof) return false;
  const want = Buffer.from(shareProof(code));
  const got = Buffer.from(proof);
  return want.length === got.length && timingSafeEqual(want, got);
}
