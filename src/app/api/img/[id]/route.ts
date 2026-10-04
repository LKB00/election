import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';

// A photo someone added to a choice (see schema.photos). Cached briefly (an hour on phones, 10 minutes on Vercel), so
// a photo the owner takes down disappears quickly. A taken-down duel's photos are gone too.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const [row] = await db
    .select({ data: schema.photos.data })
    .from(schema.photos)
    .innerJoin(schema.polls, eq(schema.polls.id, schema.photos.pollId))
    .where(and(eq(schema.photos.id, id), eq(schema.polls.hidden, false)))
    .limit(1);
  if (!row) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(row.data, 'base64'), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600, s-maxage=600', 'X-Content-Type-Options': 'nosniff' },
  });
}
