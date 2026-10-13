import { NextResponse, type NextRequest } from 'next/server';
import { SITE_URL } from '@/lib/site';

// Duel ids are short letters, digits and dashes. Anything else in the address (a NUL byte, spaces, very long text)
// is answered "not found" here, before it can reach the database and cause a server error.
const ID = /^[\w-]{1,64}$/;

// A page address with ?l=hi or ?l=hg (the Hindi and Hinglish versions Google is told about with hreflang) renders in
// that language for anyone who has not picked one (search engines never have). Passed on as a request header.
function withLang(req: NextRequest) {
  const l = req.nextUrl.searchParams.get('l');
  if (l !== 'hi' && l !== 'hg' && l !== 'en') return NextResponse.next();
  const h = new Headers(req.headers);
  h.set('x-url-lang', l);
  return NextResponse.next({ request: { headers: h } });
}

/** Vercel's long copy addresses (election-abc123-….vercel.app, the dashboard's "Visit" link) send people to the main
 * address (owner, Oct 2026): Google sign-in works only on addresses Firebase knows ("unauthorized-domain"), and a link
 * shared from a copy should be the real one. The main address itself is never redirected here (after a move to the
 * owner's own domain, Vercel's own Domains setting does that). Only on the live site, never locally. */
export function toMainAddress(req: NextRequest): NextResponse | null {
  if (process.env.VERCEL_ENV !== 'production') return null;
  const host = (req.headers.get('host') ?? '').toLowerCase();
  const main = new URL(SITE_URL).host.toLowerCase();
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.toLowerCase();
  if (!host.endsWith('.vercel.app') || host === main || host === prod) return null;
  return NextResponse.redirect(new URL(req.nextUrl.pathname + req.nextUrl.search, SITE_URL), 308);
}

export function middleware(req: NextRequest) {
  const moved = toMainAddress(req);
  if (moved) return moved;
  const path = req.nextUrl.pathname;
  if (!(path.startsWith('/p/') || path.startsWith('/u/') || /^\/api\/(polls|og|card|admin|img|results)\//.test(path))) return withLang(req);
  const id = req.nextUrl.pathname.split('/')[req.nextUrl.pathname.startsWith('/api/') ? 3 : 2];
  let ok = false;
  try {
    ok = ID.test(decodeURIComponent(id ?? ''));
  } catch {
    ok = false;
  }
  if (ok) return path.startsWith('/api/') ? NextResponse.next() : withLang(req);
  return req.nextUrl.pathname.startsWith('/api/')
    ? NextResponse.json({ error: 'Poll not found.' }, { status: 404 })
    : NextResponse.rewrite(new URL('/not-found-page', req.url), { status: 404 });
}

export const config = { matcher: ['/((?!_next/|api/(?!polls/|og/|card/|admin/|img/|results/)|sw.js|manifest|icon|apple-icon|favicon|robots.txt|sitemap.xml).*)'] };
