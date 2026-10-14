import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Vote } from 'lucide-react';
import { and, desc, eq, isNull, ne, or, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { currentUser } from '@/lib/auth';
import { getT } from '@/lib/lang-server';
import { isCode } from '@/lib/validation';
import EmptyState from '@/components/EmptyState';
import BioLink from '@/components/BioLink';
import DuelGame from '@/components/DuelGame';
import { getPoll, type PollView } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

// A poll maker's public page (docs/DESIGN.md, "Poll maker tools", "Bio link"): their name and face, their newest open
// poll ready to vote in one tap (the page a creator puts in their Instagram, X or YouTube bio), then every poll they chose
// to put their name on (only those). No follower counts, no rankings.
async function load(id: string) {
  if (!isCode(id)) return null;
  const db = await getDb();
  const { users, polls, votes } = schema;
  const [u] = await db.select({ id: users.id, name: users.name, avatar: users.avatar }).from(users).where(eq(users.id, id)).limit(1);
  if (!u) return null;
  const rows = await db
    .select({ id: polls.id, title: polls.title, endsAt: polls.endsAt, n: sql<number>`count(${votes.id})::int` })
    .from(polls)
    .leftJoin(votes, eq(votes.pollId, polls.id))
    // Same as the public lists: no group polls (link only).
    .where(
      and(
        eq(polls.ownerId, id),
        eq(polls.showMaker, true),
        eq(polls.hidden, false),
        isNull(polls.groupSize),
      ),
    )
    .groupBy(polls.id)
    .orderBy(desc(polls.createdAt))
    .limit(50);
  return { u, rows };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const data = await load((await params).id);
  const t = await getT();
  if (!data) return { title: t.notFound };
  // Only worth listing in search once there is something on it.
  return { title: t.makerPolls(data.u.name), robots: data.rows.length ? undefined : { index: false } };
}

export default async function MakerPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await load((await params).id);
  if (!data) notFound();
  const t = await getT();
  const { u, rows } = data;
  // Your own page: a way to your tools (You).
  const db = await getDb();
  const me = await currentUser(db);
  // P1: the newest open polls, voted right here (a few, newest first; the first you have not voted in comes up).
  const voterId = await readVoterId();
  const openIds = rows.filter((p) => !p.endsAt || p.endsAt.getTime() > Date.now()).slice(0, 5).map((p) => p.id);
  const deck = (await Promise.all(openIds.map((id) => getPoll(db, id, voterId)))).filter((v): v is PollView => v !== null && !v.ideas?.open);
  const start = Math.max(0, deck.findIndex((v) => v.myVote === null));
  const mine = me?.id === u.id;
  // Computers (election.css, "Desktop"): the same shape as You, the maker on the left and their polls beside them.
  return (
    <div className="page you-page">
      <header className="page-head page-head-tight you-me">
        <div className="profile-card">
          <span className="profile-face" aria-hidden>{u.avatar}</span>
          <span className="profile-who">
            <h1 className="profile-name">{t.makerPolls(u.name)}</h1>
            <span className="small muted">{t.makerLead}</span>
          </span>
        </div>
        {mine && <Link href="/you" className="text-link small">{t.thisIsYou} →</Link>}
        {mine && <BioLink url={`${SITE_URL}/u/${u.id}`} />}
      </header>
      {deck.length > 0 && (
        <section className="al-block bio-latest" aria-label={t.bioLatest}>
          <h2 className="al-block__title">{t.bioLatest}</h2>
          <DuelGame deck={deck} start={start} ownId={mine ? deck[start]?.id : undefined} />
        </section>
      )}
      {rows.length ? (
        <section className="al-block you-polls">
          {deck.length > 0 && <h2 className="al-block__title">{t.bioEarlier}<span className="al-block__aside">{t.pollsN(rows.length)}</span></h2>}
          <ul className="al-listcard al-stagger">
            {rows.map((p, n) => {
              const closed = !!p.endsAt && p.endsAt.getTime() <= Date.now();
              return (
                <li key={p.id} style={{ '--row': n } as React.CSSProperties}>
                  <Link href={`/p/${p.id}`} className="al-row">
                    <span className="al-row__disc" style={{ '--tone': 'var(--p-input)' } as React.CSSProperties}><Vote size={20} strokeWidth={1.75} aria-hidden /></span>
                    <span className="al-row__main">
                      <span className="al-row__title">{p.title}</span>
                      <span className="al-row__meta">{t.votes(p.n)}{closed ? ` · ${t.pollClosedTag}` : ''}</span>
                    </span>
                    <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <div className="you-polls"><EmptyState kind="list" title={t.makerEmpty} action={{ href: '/polls', label: t.duels }} /></div>
      )}
    </div>
  );
}
