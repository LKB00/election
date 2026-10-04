import type { Metadata } from 'next';
import Link from 'next/link';
import Spot from '@/components/Spot';
import { topicIcon, topicTone } from '@/lib/topicIcons';
import { Search } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import DuelBanner from '@/components/DuelBanner';
import DuelTiles from '@/components/DuelTiles';
import { getDb } from '@/db';
import { getFeaturedId, getMyVotes, getPoll, listPolls, trendingPolls } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';
import { getT, langAlternates } from '@/lib/lang-server';
import { CATEGORIES } from '@/lib/categories';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Polls', alternates: await langAlternates('/polls') };
}

// P1: the duel of the day (dark banner). P2: browse the tiles. While searching, only the matches (P1) show.
export default async function Duels({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? '').trim().slice(0, 60);
  const db = await getDb();
  const t = await getT();
  const voterId = await readVoterId();
  const featuredId = q ? null : await getFeaturedId(db);
  const [featured, polls, mine, hot] = await Promise.all([
    featuredId ? getPoll(db, featuredId, voterId) : Promise.resolve(null),
    listPolls(db, 60, { q }),
    getMyVotes(db, voterId, 200),
    q ? Promise.resolve([]) : trendingPolls(db, 3),
  ]);
  const rest = polls.filter((p) => !hot.some((h) => h.id === p.id));
  // No polls at all yet: only the empty state (search and topics would lead nowhere).
  const empty = !q && !polls.length && !featured;
  if (empty) {
    return (
      <div className="page page-wide empty-page">
        <h1 className="sr-only">{t.duels}</h1>
        <EmptyState kind="list" title={t.emptyHome} line={t.emptyHomeLine} action={{ href: '/create', label: t.startDuel }} />
      </div>
    );
  }
  return (
    <div className="page page-wide">
      <header className="page-head">
        <h1 className="sr-only">{t.duels}</h1>
        {/* P2: search. A plain form, so it works before the page's script loads and the result has its own link. */}
        <form role="search" action="/polls" className="row poll-search">
          <label className="search">
            <Search size={14} strokeWidth={1.75} aria-hidden />
            <input type="search" name="q" defaultValue={q} maxLength={60} placeholder={t.searchPh} aria-label={t.searchPh} enterKeyHint="search" />
          </label>
          <button type="submit" className="btn btn-ghost">{t.searchGo}</button>
        </form>
      </header>
      {/* P2: browse by topic, right under search (one scrolling row of pictures + words). */}
      {!q && (
        <nav className="topic-chips topic-row block-tight" aria-label={t.topics}>
          {CATEGORIES.map((c) => (
            <Link key={c} href={`/topic/${c}`} className="chip topic-chip">
              <span className="topic-chip__disc" style={{ '--tone': topicTone(c) } as React.CSSProperties} aria-hidden>{(() => { const I = topicIcon(c); return <I size={14} strokeWidth={1.75} />; })()}</span>
              {t.categories[c] ?? c}
            </Link>
          ))}
        </nav>
      )}
      {q && (
        <section className="al-block" aria-live="polite">
          {/* No matches: the empty picture says so; a heading above it would say it twice. */}
          {polls.length > 0 ? <h2 className="al-block__title">{t.searchFor(q)}<span className="al-block__aside">{t.pollsN(polls.length)}</span></h2> : <h2 className="sr-only">{t.searchFor(q)}</h2>}
          {polls.length > 0 ? (
            <DuelTiles polls={polls} votedIds={mine.map((v) => v.pollId)} noCreate />
          ) : (
            <EmptyState kind="search" title={t.searchNoneTitle} line={t.searchNone} action={{ href: `/create?title=${encodeURIComponent(q)}`, label: t.searchAsk }} secondary={{ href: '/polls', label: t.searchClear }} />
          )}
          {polls.length > 0 && <p className="small block-tight"><Link href="/polls" className="text-link">{t.searchClear}</Link></p>}
        </section>
      )}
      {!q && (<>
      {/* Not voted yet: the duel of the day is the main thing here. Voted: it steps back below the duels you have not done. */}
      {featured && featured.myVote === null && (
        <section className="block block-tight">
          <DuelBanner poll={featured} />
        </section>
      )}
      {/* P2: the duels with the most votes in the last hour, like TV's "hot seats". Not repeated in the list below. */}
      {hot.length > 0 && (
        <section className="al-block">
          <h2 className="al-block__title">{t.trendingNow}<span className="al-block__aside">{t.pollsN(hot.length)}</span></h2>
          <DuelTiles polls={hot} votedIds={mine.map((v) => v.pollId)} noCreate />
        </section>
      )}
      <section className="al-block">
        {/* A heading only when something sits above; otherwise it would just repeat the page title. */}
        {((featured && featured.myVote === null) || hot.length > 0) && <h2 className="al-block__title">{t.allDuels}<span className="al-block__aside">{t.pollsN(rest.length)}</span></h2>}
        <DuelTiles polls={rest} votedIds={mine.map((v) => v.pollId)} limit={12} />
      </section>
      {featured && featured.myVote !== null && (
        <section className="block">
          <DuelBanner poll={featured} />
        </section>
      )}
      </>)}
    </div>
  );
}
