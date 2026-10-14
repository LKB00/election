import { desc, eq } from 'drizzle-orm';
import { schema, type Db } from '@/db';
import { isCode } from './validation';

// Verified profiles (docs/DESIGN.md, "Verified badge"): the owner marks a real creator, brand or college on /admin,
// by pasting their profile link (…/u/<id>) or the id. A small badge then shows next to their name.
const { users } = schema;

/** The profile id in "https://chunav.lokeshbhatia.com/u/abc123", "/u/abc123" or "abc123". */
export const profileIdFrom = (raw: string) => {
  const m = raw.trim().match(/(?:\/u\/)?([\w-]{1,64})\/?(?:[?#].*)?$/);
  return m && isCode(m[1]) ? m[1] : null;
};

export async function setVerified(db: Db, raw: string, on: boolean): Promise<{ id: string; name: string } | null> {
  const id = profileIdFrom(raw);
  if (!id) return null;
  const [u] = await db.update(users).set({ verified: on }).where(eq(users.id, id)).returning({ id: users.id, name: users.name });
  return u ?? null;
}

export async function listVerified(db: Db) {
  return db.select({ id: users.id, name: users.name, avatar: users.avatar }).from(users).where(eq(users.verified, true)).orderBy(desc(users.createdAt)).limit(200);
}
