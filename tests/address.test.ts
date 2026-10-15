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

// A pasted link that got changed on the way still opens its poll (owner, Oct 2026: a Mac's share menu copied the
// link with the whole message after it).
describe('messy links', () => {
  it('cleans capitals and anything stuck to the end of a poll, pack, battle or circle id', async () => {
    const { tidyLink } = await import('@/middleware');
    expect(tidyLink('/p/naxbzfvi%20Narendra%20Modi%20or%20Rahul%20Gandhi')).toBe('/p/naxbzfvi');
    expect(tidyLink('/p/NAXBZFVI')).toBe('/p/naxbzfvi');
    expect(tidyLink('/p/naxbzfvi.')).toBe('/p/naxbzfvi');
    expect(tidyLink('/p/naxbzfvi)/manage')).toBe('/p/naxbzfvi/manage');
    expect(tidyLink('/pack/ab2cd3ef%20')).toBe('/pack/ab2cd3ef');
    // Clean links, other pages and nonsense are left alone.
    expect(tidyLink('/p/naxbzfvi')).toBeNull();
    expect(tidyLink('/p/naxbzfvi/manage')).toBeNull();
    expect(tidyLink('/polls')).toBeNull();
    expect(tidyLink('/u/Someone')).toBeNull();
    expect(tidyLink('/p/short')).toBeNull();
  });

  it('keeps only the site\'s own settings when it redirects', async () => {
    const { middleware } = await import('@/middleware');
    const res = middleware(new NextRequest('https://chunav.lokeshbhatia.com/p/naxbzfvi%20Narendra%20Modi%20or%20Rahul%20Gandhi?%20Who%20would&src=link'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('https://chunav.lokeshbhatia.com/p/naxbzfvi?src=link');
  });
});
