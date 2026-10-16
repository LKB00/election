import { FILTER_MIN, LIST_FIRST } from '@/lib/limits';
import type { Metadata } from 'next';
import Link from 'next/link';
import { topicIcon, topicTone } from '@/lib/topicIcons';
import { Hash, Search } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import DuelTiles from '@/components/DuelTiles';
import PollFilter, { parseShow, type Show } from '@/components/PollFilter';
import { getDb } from '@/db';
import { votedPollIds, listPolls, trendingPolls } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';
import { getT, langAlternates } from '@/lib/lang-server';
import { CATEGORIES } from '@/lib/categories';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).duels, alternates: await langAlternates('/polls') };
}

// P1: the polls waiting for your vote (trending first); P2: the ones you voted on; P3: ended ones you missed. While
// searching, only the matches (P1) show.
export default async function Duels({ searchParams }: { searchParams: Promise<{ q?: string | string[]; show?: string | string[] }> }) {
  const sp = await searchParams;
  const raw = sp.q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? '').trim().slice(0, 60);
  const db = await getDb();
  const t = await getT();
  const voterId = await readVoterId();
  const [polls, mine, hot] = await Promise.all([
    listPolls(db, 60, { q }),
    votedPollIds(db, voterId),
    q ? Promise.resolve([]) : trendingPolls(db, 6),
  ]);
  // Sorted by what you can still do (owner, Oct 2026: "if I have voted there should be meaningful segregation"):
  // open polls waiting for your vote first (trending ones on top), then the ones you voted on, then ended ones you
  // missed. Each poll shows once.
  const voted = new Set(mine);
  const trending = hot.filter((p) => !voted.has(p.id) && !p.closed).slice(0, 3);
  const toVote = polls.filter((p) => !p.closed && !voted.has(p.id) && !trending.some((h) => h.id === p.id));
  const done = polls.filter((p) => voted.has(p.id));
  const ended = polls.filter((p) => p.closed && !voted.has(p.id));
  // Many polls: tabs instead of one long page; "To vote" is the default.
  const filtered = polls.length > FILTER_MIN;
  const show = parseShow(sp.show);
  const on = (k: Show) => !filtered || show === k;
  // No polls at all yet: only the empty state (search and topics would lead nowhere).
  const empty = !q && !polls.length;
  if (empty) {
    return (
      <div className="page page-wide empty-page">
        <h1 className="sr-only">{t.duels}</h1>
        <EmptyState kind="list" title={t.emptyHome} line={t.emptyHomeLine} action={{ href: '/create', label: t.startDuel }} />
      </div>
    );
  }
  return (
    <div className="page page-wide polls-grid">
      {/* Computers (election.css, "Desktop"): search and topics in a left column that stays in place while the list
          scrolls beside it. Phones: the same parts, top to bottom. */}
      <div className="polls-side">
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
        {/* P3: a room (class, office, event) joins with the number on the big screen or poster. */}
        {!q && <Link href="/join" className="text-link small join-link"><Hash size={14} strokeWidth={2} aria-hidden /> {t.joinHave}</Link>}
      </header>
      {/* P2: browse by topic, right under search (one scrolling row of pictures + words). */}
      {/* Computers only: names the topic list in the left column (on phones the row of pictures says it). */}
      {!q && <p className="label polls-side__label" aria-hidden>{t.topics}</p>}
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
      </div>
      <div className="polls-main">
      {q && (
        <section className="al-block" aria-live="polite">
          {/* No matches: the empty picture says so; a heading above it would say it twice. */}
          {polls.length > 0 ? <h2 className="al-block__title">{t.searchFor(q)}<span className="al-block__aside">{t.pollsN(polls.length)}</span></h2> : <h2 className="sr-only">{t.searchFor(q)}</h2>}
          {polls.length > 0 ? (
            <DuelTiles from="polls" polls={polls} votedIds={mine} noCreate />
          ) : (
            <EmptyState kind="search" title={t.searchNoneTitle} line={t.searchNone} action={{ href: `/create?title=${encodeURIComponent(q)}`, label: t.searchAsk }} secondary={{ href: '/polls', label: t.searchClear }} />
          )}
          {polls.length > 0 && <p className="small block-tight"><Link href="/polls" className="text-link">{t.searchClear}</Link></p>}
        </section>
      )}
      {!q && (<>
      {filtered && <PollFilter base="/polls" show={show} t={t} counts={{ to: trending.length + toVote.length, voted: done.length, ended: ended.length }} />}
      {/* P1: open polls you have not voted on. The busiest of the last hour first ("Trending now"), then the rest. */}
      {on('to') && trending.length > 0 && (
        <section className="al-block">
          <h2 className="al-block__title"><span className="live-dot al-block__live" aria-hidden />{t.trendingNow}<span className="al-block__aside">{t.pollsN(trending.length)}</span></h2>
          <DuelTiles from="polls" polls={trending} votedIds={mine} noCreate />
        </section>
      )}
      {on('to') && toVote.length > 0 && (
        <section className="al-block">
          <h2 className="al-block__title">{t.pollsToVote}<span className="al-block__aside">{t.pollsN(toVote.length)}</span></h2>
          <DuelTiles from="polls" polls={toVote} votedIds={mine} noCreate limit={LIST_FIRST} />
        </section>
      )}
      {/* Nothing left to vote on: say so, and the one next step (a poll of your own). */}
      {on('to') && trending.length === 0 && toVote.length === 0 && (
        <section className="al-block">
          <EmptyState kind="list" title={t.allVotedTitle} line={t.allVotedLine} action={{ href: '/create', label: t.startDuel }} />
        </section>
      )}
      {/* P2: the polls you voted on (results, how they are going), a few at a time. */}
      {on('voted') && done.length > 0 && (
        <section className="al-block">
          <h2 className="al-block__title">{t.pollsVoted}<span className="al-block__aside">{t.pollsN(done.length)}</span></h2>
          <DuelTiles from="polls" polls={done} votedIds={mine} noCreate limit={LIST_FIRST} />
        </section>
      )}
      {/* P3: ended polls you missed (results only). */}
      {on('ended') && ended.length > 0 && (
        <section className="al-block">
          <h2 className="al-block__title">{t.pollsEnded}<span className="al-block__aside">{t.pollsN(ended.length)}</span></h2>
          <DuelTiles from="polls" polls={ended} votedIds={mine} noCreate limit={LIST_FIRST} />
        </section>
      )}
      {filtered && show !== 'to' && (show === 'voted' ? done : ended).length === 0 && <p className="small muted">{t.filterNone}</p>}
      </>)}
      </div>
    </div>
  );
}
