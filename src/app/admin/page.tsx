import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AdminRow from '@/components/AdminRow';
import TodayPicker from '@/components/TodayPicker';
import { getDb } from '@/db';
import { isAdminKey } from '@/lib/admin';
import { getFeaturedId, getPlannedToday, getPoll, getReviewQueue, indiaDay, listPolls } from '@/lib/polls';
import { getT } from '@/lib/lang-server';
import { getStats } from '@/lib/stats';
import EmptyState from '@/components/EmptyState';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).adminTitle, robots: { index: false, follow: false } };
}

// The owner's review page: /admin?key=<ADMIN_SECRET>. Anyone else gets "not found".
// Reported duels first, then new duels nobody has checked. Hide takes one down at once.
export default async function Admin({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  if (!isAdminKey(key)) notFound();
  const t = await getT();
  const db = await getDb();
  const [items, featuredId, recent, stats, planned] = await Promise.all([getReviewQueue(db), getFeaturedId(db), listPolls(db, 20), getStats(db), getPlannedToday(db)]);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const featured = featuredId ? await getPoll(db, featuredId, null) : null;
  return (
    <div className="page">
      <header className="page-head page-head-tight">
        <h1 className="display">{t.adminTitle}</h1>
        <p className="lead">{t.adminLead}</p>
        {items.length > 0 && (
          <p className="small"><strong>{t.adminSummary(items.filter((i) => i.paused).length, items.filter((i) => i.reports > 0).length, items.filter((i) => !i.reviewed && i.reports === 0).length)}</strong></p>
        )}
      </header>
      <section className="block">
        {items.length === 0 ? <EmptyState kind="done" title={t.adminEmpty} /> : items.map((item) => <AdminRow key={item.id} item={item} adminKey={key!} />)}
      </section>
      {/* After the queue: what needs you comes first. */}
      <TodayPicker current={featured ? { id: featured.id, title: featured.title } : null} polls={recent.filter((p) => !p.closed).map((p) => ({ id: p.id, title: p.title }))} planned={planned} adminKey={key!} todayLabel={indiaDay().label} />
      {/* P3: how the site is doing. The first line is the one to watch (docs/ENGAGEMENT.md). */}
      <section className="block admin-stats">
        <h2>{t.statsTitle}</h2>
        <p className="small muted">{t.statsLead}</p>
        <p><strong>{t.statsReturning(stats.weekReturning, stats.weekVoters)}</strong><br /><span className="small">{t.statsReturningGoal(pct(stats.weekReturning, stats.weekVoters))}</span></p>
        <ul className="small">
          <li>{t.statsToday(stats.todayVoters, stats.todayVotes)}</li>
          <li>{t.statsNew(stats.newVoters, stats.newCameBack)}</li>
          <li>{t.statsFriends(stats.weekViaFriends, stats.weekVotes)}</li>
          <li>{t.statsPolitics(pct(stats.politicsVotes, stats.weekVotes))}</li>
        </ul>
      </section>
    </div>
  );
}
