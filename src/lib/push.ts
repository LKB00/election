import { and, eq, gt, inArray, isNotNull, lte, or } from 'drizzle-orm';
import webpush from 'web-push';
import { schema, type Db } from '@/db';
import { dict, isLang } from './i18n';

// "Tell me the result" (docs/DESIGN.md, "Result alerts"): opt-in, per poll, one alert when its result is in, then
// nothing. Switched off until the owner sets the VAPID keys (docs/OWNER_TODO.md).
const { pushSubs, pushWants, polls } = schema;

export const pushEnabled = () => !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;

export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };
export const isPushSub = (s: unknown): s is PushSub => {
  const v = s as PushSub;
  return (
    !!v && typeof v.endpoint === 'string' && v.endpoint.startsWith('https://') && v.endpoint.length < 1000 &&
    typeof v.keys?.p256dh === 'string' && v.keys.p256dh.length < 200 && typeof v.keys?.auth === 'string' && v.keys.auth.length < 100
  );
};

/** Remember this phone's push address and that it wants this poll's result. */
export async function wantResult(db: Db, voterKey: string, sub: PushSub, pollId: string, lang: string) {
  const [poll] = await db.select({ id: polls.id }).from(polls).where(and(eq(polls.id, pollId), eq(polls.hidden, false))).limit(1);
  if (!poll) return false;
  await db
    .insert(pushSubs)
    .values({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, voterKey, lang: isLang(lang) ? lang : 'en' })
    .onConflictDoUpdate({ target: pushSubs.endpoint, set: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, voterKey, lang: isLang(lang) ? lang : 'en' } });
  await db.insert(pushWants).values({ pollId, endpoint: sub.endpoint }).onConflictDoNothing();
  return true;
}

export async function dropWant(db: Db, endpoint: string, pollId: string) {
  await db.delete(pushWants).where(and(eq(pushWants.endpoint, endpoint), eq(pushWants.pollId, pollId)));
}

export type Sender = (sub: PushSub, payload: string) => Promise<{ gone: boolean; ok?: boolean }>;
const webSender: Sender = async (sub, payload) => {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:owner@example.com', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 6 * 3600 });
    return { gone: false, ok: true };
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    return { gone: code === 404 || code === 410, ok: false };
  }
};

/** Polls whose result came in (ended in the last day; a "Called it" only once its answer is marked) and someone is waiting. */
export async function duePolls(db: Db): Promise<string[]> {
  const rows = await db
    .selectDistinct({ id: polls.id })
    .from(polls)
    .innerJoin(pushWants, eq(pushWants.pollId, polls.id))
    .where(
      and(
        isNotNull(polls.endsAt),
        lte(polls.endsAt, new Date()),
        gt(polls.endsAt, new Date(Date.now() - 26 * 3_600_000)),
        or(eq(polls.calledIt, false), isNotNull(polls.outcome)),
      ),
    );
  return rows.map((r) => r.id);
}

/** One alert per phone for these polls (several results at once become one "3 results are in"), then the wants go. */
export async function sendResultAlerts(db: Db, pollIds: string[], send: Sender = webSender): Promise<number> {
  if (!pollIds.length) return 0;
  const rows = await db
    .select({ endpoint: pushSubs.endpoint, p256dh: pushSubs.p256dh, auth: pushSubs.auth, lang: pushSubs.lang, pollId: polls.id, title: polls.title, calledIt: polls.calledIt })
    .from(pushWants)
    .innerJoin(pushSubs, eq(pushSubs.endpoint, pushWants.endpoint))
    .innerJoin(polls, eq(polls.id, pushWants.pollId))
    .where(and(inArray(pushWants.pollId, pollIds), eq(polls.hidden, false)));
  const byPhone = new Map<string, typeof rows>();
  for (const r of rows) byPhone.set(r.endpoint, [...(byPhone.get(r.endpoint) ?? []), r]);
  let sent = 0;
  for (const [endpoint, list] of byPhone) {
    const t = dict[isLang(list[0].lang) ? list[0].lang : 'en'];
    const one = list.length === 1 ? list[0] : null;
    const payload = JSON.stringify(
      one
        ? { title: one.title, body: one.calledIt ? t.pushBodyCalled : t.pushBody, url: `/p/${one.pollId}` }
        : { title: t.pushMany(list.length), body: list.map((r) => r.title).join(' · ').slice(0, 140), url: '/me' },
    );
    const { gone, ok = true } = await send({ endpoint, keys: { p256dh: list[0].p256dh, auth: list[0].auth } }, payload);
    if (gone) await db.delete(pushSubs).where(eq(pushSubs.endpoint, endpoint));
    else if (ok) {
      sent++;
      await db.update(pushSubs).set({ lastSentAt: new Date() }).where(eq(pushSubs.endpoint, endpoint));
    }
    await db.delete(pushWants).where(and(eq(pushWants.endpoint, endpoint), inArray(pushWants.pollId, list.map((r) => r.pollId))));
  }
  return sent;
}
