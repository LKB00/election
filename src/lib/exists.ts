import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { isCode } from '@/lib/validation';

// "Is there such a page?", asked by a layout before the page starts streaming (docs/DESIGN.md, "Real not found"). The
// loading picture used to go out first with an OK status, so a deleted or mistyped poll link told Google "this page is
// fine". One small lookup by id; the page itself still checks everything else (a hidden poll, say).
type Kind = 'poll' | 'battle' | 'pack' | 'user';

export async function exists(kind: Kind, id: string): Promise<boolean> {
  if (!isCode(id)) return false;
  const db = await getDb();
  const { polls, battles, packs, users } = schema;
  const table = kind === 'poll' ? polls : kind === 'battle' ? battles : kind === 'pack' ? packs : users;
  const rows = await db.select({ id: table.id }).from(table).where(eq(table.id, id)).limit(1);
  return rows.length > 0;
}
