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

/** A pasted link that got changed on the way (owner, Oct 2026: a copied poll link opened "Poll not found"): capital
 * letters (/p/NAXBZFVI, a phone's auto-capitalise), or something stuck to its end (a space, a full stop, a bracket or
 * the whole share message: a Mac's share menu "Copy" puts "<link> <question> Who would you pick?…" on the clipboard). Poll, pack, battle and circle ids are 8 small letters and digits, so the first 8 of
 * those are the id: answered with a redirect to the clean address (the rest of the path and the ?query kept). */
const CLEAN_ID = /^[23456789a-z]{8}/;
const KEEP = ['src', 'f', 's', 'o', 'l', 'new', 'back', 'k'];
export function tidyLink(path: string): string | null {
  const m = /^\/(p|pack|b|c)\/([^/]+)(\/.*)?$/.exec(path);
  if (!m) return null;
  let seg: string;
  try {
    seg = decodeURIComponent(m[2]);
  } catch {
    return null;
  }
  const id = CLEAN_ID.exec(seg.trim().toLowerCase())?.[0];
  if (!id || id === m[2]) return null;
  return `/${m[1]}/${id}${m[3] ?? ''}`;
}

export function middleware(req: NextRequest) {
  const moved = toMainAddress(req);
  if (moved) return moved;
  const tidy = tidyLink(req.nextUrl.pathname);
  if (tidy) {
    // Only the site's own settings come along (a pasted message's "?" can start a junk "query" of its words).
    const keep = new URLSearchParams();
    for (const k of KEEP) {
      const v = req.nextUrl.searchParams.get(k);
      if (v && /^[\w-]{1,64}$/.test(v)) keep.set(k, v);
    }
    const q = keep.toString();
    return NextResponse.redirect(new URL(tidy + (q ? `?${q}` : ''), req.url), 308);
  }
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
    ? NextResponse.json({ error: 'We could not find this poll. It may have been removed.' }, { status: 404 })
    : NextResponse.rewrite(new URL('/not-found-page', req.url), { status: 404 });
}

export const config = { matcher: ['/((?!_next/|api/(?!polls/|og/|card/|admin/|img/|results/)|sw.js|manifest|icon|apple-icon|favicon|robots.txt|sitemap.xml).*)'] };
