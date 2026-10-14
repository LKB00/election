import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { schema, type Db } from '@/db';
import { CIRCLE_EMOJIS } from './avatars';
import { CIRCLES_PER_PERSON, CIRCLE_MAX_MEMBERS, CIRCLE_NAME_MAX } from './limits';
import { hasBlockedWord } from './moderation';
import { cleanText } from './validation';

// Circles (docs/DESIGN.md, "Circles"): a small named group of profiles (family, college friends, a team). Anyone with
// the circle's invite link can join (signed in); its polls are ordinary polls with circle_id set, never in public lists,
// listed on the circle's page for its members. Votes stay anonymous as everywhere: a circle never shows who voted what.
const { circles, circleMembers, polls, votes, users } = schema;
const circleId = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 8);
const inviteCode = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 12);


export type CircleSummary = { id: string; name: string; emoji: string; members: number; polls: number; mine: boolean };
export type CircleView = CircleSummary & {
  member: boolean;
  /** The invite link's code: only for members (they may pass it on, like a group chat link). */
  invite: string | null;
  faces: { name: string; avatar: string }[];
  list: { id: string; title: string; votes: number; closed: boolean }[];
};

/** What each refusal says (the API's message, translated on the phone; and its status). */
export const CIRCLE_ERRORS = {
  name: ['Give the circle a short name.', 400],
  blocked: ['Please keep it friendly. Try other words.', 400],
  too_many: ['You have made the most circles one person can.', 400],
  not_found: ['This invite link does not work any more. Ask for a new one.', 404],
  full: ['This circle is full.', 400],
  not_allowed: ['Only the person who made the circle can do that.', 403],
} as const;

export type CircleResult = { ok: true; id: string } | { ok: false; error: 'name' | 'blocked' | 'too_many' | 'not_found' | 'full' | 'not_allowed' };

/** Makes a circle with its maker as the first member. */
export async function createCircle(db: Db, uid: string, rawName: string, rawEmoji: string): Promise<CircleResult> {
  const name = cleanText(rawName).replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > CIRCLE_NAME_MAX) return { ok: false, error: 'name' };
  if (hasBlockedWord(name)) return { ok: false, error: 'blocked' };
  const emoji = (CIRCLE_EMOJIS as readonly string[]).includes(rawEmoji) ? rawEmoji : CIRCLE_EMOJIS[0];
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(circles).where(eq(circles.ownerId, uid));
  if ((row?.n ?? 0) >= CIRCLES_PER_PERSON) return { ok: false, error: 'too_many' };
  const id = circleId();
  await db.transaction(async (tx) => {
    await tx.insert(circles).values({ id, name, emoji, ownerId: uid, invite: inviteCode() });
    await tx.insert(circleMembers).values({ circleId: id, userId: uid });
  });
  return { ok: true, id };
}

export async function isMember(db: Db, id: string, uid: string): Promise<boolean> {
  const rows = await db.select({ id: circleMembers.circleId }).from(circleMembers).where(and(eq(circleMembers.circleId, id), eq(circleMembers.userId, uid))).limit(1);
  return rows.length > 0;
}

/** The circles you are in, newest joined first, with how many members and polls each has. */
export async function myCircles(db: Db, uid: string): Promise<CircleSummary[]> {
  const rows = await db
    .select({ id: circles.id, name: circles.name, emoji: circles.emoji, ownerId: circles.ownerId })
    .from(circleMembers)
    .innerJoin(circles, eq(circles.id, circleMembers.circleId))
    .where(eq(circleMembers.userId, uid))
    .orderBy(desc(circleMembers.joinedAt));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [members, pollCounts] = await Promise.all([
    db.select({ id: circleMembers.circleId, n: sql<number>`count(*)::int` }).from(circleMembers).where(inArray(circleMembers.circleId, ids)).groupBy(circleMembers.circleId),
    db.select({ id: polls.circleId, n: sql<number>`count(*)::int` }).from(polls).where(and(inArray(polls.circleId, ids), eq(polls.hidden, false), isNull(polls.deletedAt))).groupBy(polls.circleId),
  ]);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    mine: r.ownerId === uid,
    members: members.find((m) => m.id === r.id)?.n ?? 0,
    polls: pollCounts.find((p) => p.id === r.id)?.n ?? 0,
  }));
}

/** A circle as this person sees it: its name for anyone with the link; members, polls and the invite only for members. */
export async function getCircle(db: Db, id: string, uid: string | null): Promise<CircleView | null> {
  const [c] = await db.select().from(circles).where(eq(circles.id, id)).limit(1);
  if (!c) return null;
  const member = uid ? await isMember(db, id, uid) : false;
  const [faces, count, list] = await Promise.all([
    member
      ? db.select({ name: users.name, avatar: users.avatar }).from(circleMembers).innerJoin(users, eq(users.id, circleMembers.userId)).where(eq(circleMembers.circleId, id)).orderBy(circleMembers.joinedAt).limit(CIRCLE_MAX_MEMBERS)
      : Promise.resolve([] as { name: string; avatar: string }[]),
    db.select({ n: sql<number>`count(*)::int` }).from(circleMembers).where(eq(circleMembers.circleId, id)),
    member
      ? db
          .select({ id: polls.id, title: polls.title, endsAt: polls.endsAt, votes: sql<number>`count(${votes.id})::int` })
          .from(polls)
          .leftJoin(votes, eq(votes.pollId, polls.id))
          .where(and(eq(polls.circleId, id), eq(polls.hidden, false), isNull(polls.deletedAt)))
          .groupBy(polls.id)
          .orderBy(desc(polls.createdAt))
          .limit(100)
      : Promise.resolve([] as { id: string; title: string; endsAt: Date | null; votes: number }[]),
  ]);
  return {
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    mine: !!uid && c.ownerId === uid,
    member,
    members: count[0]?.n ?? 0,
    polls: list.length,
    invite: member ? c.invite : null,
    faces,
    list: list.map((p) => ({ id: p.id, title: p.title, votes: p.votes, closed: !!p.endsAt && p.endsAt.getTime() <= Date.now() })),
  };
}

/** Joins with the invite code. Already a member: fine (ok). A full circle says so. */
export async function joinCircle(db: Db, id: string, invite: string, uid: string): Promise<CircleResult> {
  const [c] = await db.select({ id: circles.id, invite: circles.invite }).from(circles).where(eq(circles.id, id)).limit(1);
  if (!c || c.invite !== invite) return { ok: false, error: 'not_found' };
  if (await isMember(db, id, uid)) return { ok: true, id };
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(circleMembers).where(eq(circleMembers.circleId, id));
  if ((row?.n ?? 0) >= CIRCLE_MAX_MEMBERS) return { ok: false, error: 'full' };
  await db.insert(circleMembers).values({ circleId: id, userId: uid }).onConflictDoNothing();
  return { ok: true, id };
}

/** Leaves a circle. Its maker cannot leave (they delete it instead), so a circle always has someone in charge. */
export async function leaveCircle(db: Db, id: string, uid: string): Promise<CircleResult> {
  const [c] = await db.select({ ownerId: circles.ownerId }).from(circles).where(eq(circles.id, id)).limit(1);
  if (!c) return { ok: false, error: 'not_found' };
  if (c.ownerId === uid) return { ok: false, error: 'not_allowed' };
  await db.delete(circleMembers).where(and(eq(circleMembers.circleId, id), eq(circleMembers.userId, uid)));
  return { ok: true, id };
}

/** The maker's controls: a new invite link (the old one stops working), or delete the circle (its polls stay at their
 *  own links, still out of public lists). */
export async function ownerAction(db: Db, id: string, uid: string, action: 'invite' | 'delete'): Promise<CircleResult> {
  const [c] = await db.select({ ownerId: circles.ownerId }).from(circles).where(eq(circles.id, id)).limit(1);
  if (!c) return { ok: false, error: 'not_found' };
  if (c.ownerId !== uid) return { ok: false, error: 'not_allowed' };
  if (action === 'invite') await db.update(circles).set({ invite: inviteCode() }).where(eq(circles.id, id));
  else await db.delete(circles).where(eq(circles.id, id));
  return { ok: true, id };
}
