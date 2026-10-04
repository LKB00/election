import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, EyeOff, PenLine } from 'lucide-react';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { pollsByOwner } from '@/lib/profiles';
import { getT } from '@/lib/lang-server';
import EmptyState from '@/components/EmptyState';
import MyPolls from '@/components/MyPolls';
import { ProfileActions, ProfileCard, YouSignIn } from '@/components/Profile';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'You', robots: { index: false } };

// You (docs/DESIGN.md, "Profiles"). Signed in: your face and name, the polls you made (P1: how they are doing), and
// quietly at the bottom, sign out / delete. Signed out: the profile screen with its promises, and the polls made on this
// phone. Votes are never here: they are not part of a profile (My votes keeps them on this phone).
export default async function YouPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const db = await getDb();
  const [user, t] = await Promise.all([currentUser(db), getT()]);

  if (!user) {
    return (
      <div className="page">
        <header className="page-head page-head-tight">
          <h1 className="sr-only">{t.you}</h1>
          {deleted && <p className="small duel-friend" role="status">{t.profileDeleted}</p>}
        </header>
        <section className="block">
          <YouSignIn />
        </section>
        <MyPolls title={t.madeOnPhone} line={t.madeOnPhoneLine} />
      </div>
    );
  }

  const polls = await pollsByOwner(db, user.id);
  return (
    <div className="page">
      <header className="page-head page-head-tight">
        <h1 className="sr-only">{t.you}</h1>
        <ProfileCard user={user} />
      </header>
      {polls.length ? (
        <section className="al-block" aria-label={t.yourPolls}>
          <h2 className="al-block__title">{t.yourPolls} <span className="al-block__aside">{t.pollsN(polls.length)}</span></h2>
          <ul className="al-listcard">
            {polls.map((p) => (
              <li key={p.id}>
                <Link href={`/p/${p.id}/manage`} className="al-row">
                  <span className="al-row__disc" style={{ '--tone': 'var(--lime-badge)' } as React.CSSProperties}><PenLine size={20} strokeWidth={1.75} aria-hidden /></span>
                  <span className="al-row__main">
                    <span className="al-row__title">{p.title}</span>
                    <span className="al-row__meta">{t.votesSoFar(p.votes)}{p.closed ? ` · ${t.pollClosedTag}` : ''}</span>
                  </span>
                  <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="block">
          <EmptyState kind="pen" title={t.myPollsEmpty} line={t.myPollsEmptyLine} action={{ href: '/create', label: t.startDuel }} />
        </section>
      )}
      <p className="small muted block you-note">
        <EyeOff size={14} strokeWidth={2} aria-hidden /> {t.youVotesNote} <Link href="/me" className="text-link">{t.myVotes}</Link>
      </p>
      <ProfileActions />
    </div>
  );
}
