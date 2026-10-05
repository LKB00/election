import { createHash, timingSafeEqual } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { schema, type Db } from '@/db';
import { cleanText } from './validation';
import { hasBlockedWord } from './moderation';
import { MAX_NAME, MIN_NAME } from './limits';

// Profiles (docs/DESIGN.md, "Profiles"). Only a name, an avatar and the passkeys' public keys are kept. Votes are never
// linked to a profile: nothing here reads or writes the votes table.
const { users, passkeys, polls, votes } = schema;

export const cleanName = (raw: unknown): string | null => {
  const name = cleanText(String(raw ?? '')).slice(0, MAX_NAME);
  return name.length >= MIN_NAME && !hasBlockedWord(name) ? name : null;
};

export async function createUser(db: Db, u: { id: string; name: string; avatar: string }, key: { id: string; publicKey: string; counter: number; transports: string[] }) {
  await db.insert(users).values(u);
  await db.insert(passkeys).values({ id: key.id, userId: u.id, publicKey: key.publicKey, counter: key.counter, transports: key.transports.join(',') });
}

export async function findPasskey(db: Db, id: string) {
  const [k] = await db.select().from(passkeys).where(eq(passkeys.id, id)).limit(1);
  return k ?? null;
}
export async function bumpCounter(db: Db, id: string, counter: number) {
  await db.update(passkeys).set({ counter }).where(eq(passkeys.id, id));
}

export async function updateProfile(db: Db, uid: string, p: { name?: string; avatar?: string }) {
  await db.update(users).set(p).where(eq(users.id, uid));
}

/** Deletes the profile and its passkeys. Its polls stay up for the people voting on them, with no owner. */
export async function deleteProfile(db: Db, uid: string) {
  await db.update(polls).set({ ownerId: null }).where(eq(polls.ownerId, uid));
  await db.delete(users).where(eq(users.id, uid));
}

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');
/** Polls made on this phone before signing in: each proves itself with its private key (kept on the phone). */
export async function claimPolls(db: Db, uid: string, items: { id: string; key: string }[]): Promise<number> {
  let n = 0;
  for (const it of items.slice(0, 50)) {
    const [p] = await db.select({ hash: polls.manageHash }).from(polls).where(and(eq(polls.id, it.id), isNull(polls.ownerId))).limit(1);
    if (!p?.hash || p.hash.length !== 64 || !timingSafeEqual(Buffer.from(p.hash), Buffer.from(hashKey(it.key)))) continue;
    await db.update(polls).set({ ownerId: uid }).where(and(eq(polls.id, it.id), isNull(polls.ownerId)));
    n++;
  }
  return n;
}

export type OwnPoll = { id: string; title: string; votes: number; closed: boolean; hidden: boolean; calledIt: boolean; outcome: string | null };
/** The polls this profile made, newest first, with how many have voted. */
export async function pollsByOwner(db: Db, uid: string, limit = 50): Promise<OwnPoll[]> {
  const rows = await db
    .select({ id: polls.id, title: polls.title, endsAt: polls.endsAt, hidden: polls.hidden, calledIt: polls.calledIt, outcome: polls.outcome, votes: sql<number>`count(${votes.id})::int` })
    .from(polls)
    .leftJoin(votes, eq(votes.pollId, polls.id))
    .where(and(eq(polls.ownerId, uid), isNull(polls.deletedAt)))
    .groupBy(polls.id)
    .orderBy(desc(polls.createdAt))
    .limit(limit);
  return rows.map((r) => ({ id: r.id, title: r.title, votes: r.votes, closed: !!r.endsAt && r.endsAt.getTime() <= Date.now(), hidden: r.hidden, calledIt: r.calledIt, outcome: r.outcome }));
}
