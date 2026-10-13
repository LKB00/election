import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Vercel's copy addresses go to the main address (Google sign-in only works there); the main one and local runs never move.
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
async function check(host: string, path = '/create?l=hi') {
  const { toMainAddress } = await import('@/middleware');
  const res = toMainAddress(new NextRequest(`https://${host}${path}`, { headers: { host } }));
  return res ? res.headers.get('location') : null;
}
describe('main address', () => {
  it('sends a Vercel copy address to the main one, keeping the page and its settings', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'election-three-ruby.vercel.app');
    expect(await check('election-abc123-lkb00s-projects.vercel.app')).toBe('https://election-three-ruby.vercel.app/create?l=hi');
    expect(await check('election-three-ruby.vercel.app')).toBeNull();
    expect(await check('chunav.lokeshbhatia.com')).toBeNull();
  });
  it('never moves a local or preview run', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(await check('election-abc123-lkb00s-projects.vercel.app')).toBeNull();
    vi.stubEnv('VERCEL_ENV', '');
    expect(await check('localhost:3001')).toBeNull();
  });
});
