import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getFeaturedId } from '@/lib/polls';

export const dynamic = 'force-dynamic';

// One link that never changes: /today always opens today's question (the owner picks it on /admin).
// Post it once in a WhatsApp Channel or group bio; the poll behind it changes when you pick a new one.
// A real 307 (not a page) so WhatsApp's link preview follows it to the poll's picture.
export async function GET(req: Request) {
  const id = await getFeaturedId(await getDb());
  return NextResponse.redirect(new URL(id ? `/p/${id}` : '/polls', req.url), 307);
}
