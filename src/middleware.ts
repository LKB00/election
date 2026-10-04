import { NextResponse, type NextRequest } from 'next/server';

// Duel ids are short letters, digits and dashes. Anything else in the address (a NUL byte, spaces, very long text)
// is answered "not found" here, before it can reach the database and cause a server error.
const ID = /^[\w-]{1,64}$/;

export function middleware(req: NextRequest) {
  const id = req.nextUrl.pathname.split('/')[req.nextUrl.pathname.startsWith('/api/') ? 3 : 2];
  let ok = false;
  try {
    ok = ID.test(decodeURIComponent(id ?? ''));
  } catch {
    ok = false;
  }
  if (ok) return NextResponse.next();
  return req.nextUrl.pathname.startsWith('/api/')
    ? NextResponse.json({ error: 'Poll not found.' }, { status: 404 })
    : NextResponse.rewrite(new URL('/not-found-page', req.url), { status: 404 });
}

export const config = { matcher: ['/p/:id*', '/api/polls/:id/:rest*', '/api/og/:id*', '/api/card/:id*', '/api/admin/:id*', '/api/img/:id*'] };
