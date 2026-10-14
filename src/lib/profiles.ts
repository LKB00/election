import { createHash, timingSafeEqual } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { schema, type Db } from '@/db';
import { cleanText } from './validation';
import { hasBlockedWord } from './moderation';
import { MAX_NAME, MIN_NAME } from './limits';

// Profiles (docs/DESIGN.md, "Profiles"). Only a name, an avatar, the passkeys' public keys and scrambled Google/phone
// sign-in ids are kept. Votes are never
// linked to a profile: nothing here reads or writes the votes table.
const { users, passkeys, signIns, polls, votes } = schema;

export const cleanName = (raw: unknown): string | null => {
  const name = cleanText(String(raw ?? '')).slice(0, MAX_NAME);
  return name.length >= MIN_NAME && !hasBlockedWord(name) ? name : null;
};

export async function createUser(db: Db, u: { id: string; name: string; avatar: string }, key: { id: string; publicKey: string; counter: number; transports: string[] }) {
  await db.insert(users).values(u);
  await db.insert(passkeys).values({ id: key.id, userId: u.id, publicKey: key.publicKey, counter: key.counter, transports: key.transports.join(',') });
}

/** A Google or phone-number sign-in (its scrambled key) and the profile it belongs to. */
export async function findSignIn(db: Db, key: string): Promise<string | null> {
  const [s] = await db.select({ userId: signIns.userId }).from(signIns).where(eq(signIns.key, key)).limit(1);
  return s?.userId ?? null;
}
export async function createUserWithSignIn(db: Db, u: { id: string; name: string; avatar: string }, s: { key: string; method: 'google' | 'phone' }) {
  // Together or not at all: a second tap at the same moment must not leave a profile with no way in.
  await db.transaction(async (tx) => {
    await tx.insert(users).values(u);
    await tx.insert(signIns).values({ key: s.key, userId: u.id, method: s.method });
  });
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

export type CreatorWeek = { votes: number; made: number; top: { id: string; title: string; votes: number } | null };
/**
 * "Your week" for a poll maker (docs/DESIGN.md, "Your week"): the last 7 days on their public polls: votes that came
 * in, polls they made, and the poll that got the most. Unlisted, group, hidden and deleted polls are left out, so the
 * picture (whose address carries only the profile id) tells nobody anything they could not already count.
 */
export async function creatorWeek(db: Db, uid: string, now = Date.now()): Promise<CreatorWeek> {
  const since = new Date(now - 7 * 86_400_000);
  const rows = await db
    .select({
      id: polls.id,
      title: polls.title,
      createdAt: polls.createdAt,
      // As text: the Postgres driver cannot send a Date inside raw SQL.
      votes: sql<number>`count(${votes.id}) filter (where ${votes.createdAt} > ${since.toISOString()}::timestamptz)::int`,
    })
    .from(polls)
    .leftJoin(votes, eq(votes.pollId, polls.id))
    .where(and(eq(polls.ownerId, uid), isNull(polls.deletedAt), eq(polls.hidden, false), eq(polls.unlisted, false), isNull(polls.groupSize)))
    .groupBy(polls.id);
  const top = [...rows].sort((a, b) => b.votes - a.votes)[0];
  return {
    votes: rows.reduce((n, r) => n + r.votes, 0),
    made: rows.filter((r) => r.createdAt.getTime() > since.getTime()).length,
    top: top && top.votes > 0 ? { id: top.id, title: top.title, votes: top.votes } : null,
  };
}
