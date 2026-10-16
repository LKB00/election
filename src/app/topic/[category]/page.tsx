import { FILTER_MIN, LIST_FIRST } from '@/lib/limits';
import { topicIcon, topicTone } from '@/lib/topicIcons';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import FollowTopic from '@/components/FollowTopic';
import DuelTiles from '@/components/DuelTiles';
import QuickAsk from '@/components/QuickAsk';
import PollFilter, { parseShow, type Show } from '@/components/PollFilter';
import { getDb } from '@/db';
import { CATEGORIES } from '@/lib/categories';
import { votedPollIds, listPolls } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';
import { getT, langAlternates } from '@/lib/lang-server';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ category: string }> };
const isCategory = (c: string): c is (typeof CATEGORIES)[number] => (CATEGORIES as readonly string[]).includes(c);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const t = await getT();
  if (!isCategory(category)) return { title: t.notFound };
  return { title: t.topicTitle(t.categories[category] ?? category), description: `${t.topicTitle(t.categories[category] ?? category)}. ${t.topicLead}`, alternates: await langAlternates(`/topic/${category}`) };
}

// A topic page ("Cricket duels"): one place for people who search for a topic, and a way to browse by interest.
// P1: the tiles.
export default async function Topic({ params, searchParams }: Props & { searchParams: Promise<{ show?: string | string[] }> }) {
  const { category } = await params;
  const show = parseShow((await searchParams).show);
  if (!isCategory(category)) notFound();
  const db = await getDb();
  const t = await getT();
  const voterId = await readVoterId();
  const [polls, mine] = await Promise.all([
    listPolls(db, 60, { category }),
    votedPollIds(db, voterId),
  ]);
  const full = polls.length > 0;
  const voted = new Set(mine);
  const toVote = polls.filter((p) => !p.closed && !voted.has(p.id));
  const done = polls.filter((p) => voted.has(p.id));
  const ended = polls.filter((p) => p.closed && !voted.has(p.id));
  // Many polls: tabs instead of one long page; "To vote" is the default.
  const filtered = polls.length > FILTER_MIN;
  const on = (k: Show) => !filtered || show === k;
  return (
    <div className={'page page-wide' + (full ? ' polls-grid' : ' empty-page')}>
      {/* Computers only (election.css, "Desktop"): every topic in a left column, this one marked, like on Polls. */}
      {full && (
        <aside className="polls-side topic-side">
          <p className="label polls-side__label" aria-hidden>{t.topics}</p>
          <nav className="topic-chips topic-row" aria-label={t.topics}>
            {CATEGORIES.map((c) => (
              <Link key={c} href={`/topic/${c}`} className={'chip topic-chip' + (c === category ? ' chip-on' : '')} aria-current={c === category ? 'page' : undefined}>
                <span className="topic-chip__disc" style={{ '--tone': topicTone(c) } as React.CSSProperties} aria-hidden>{(() => { const I = topicIcon(c); return <I size={14} strokeWidth={1.75} />; })()}</span>
                {t.categories[c] ?? c}
              </Link>
            ))}
          </nav>
        </aside>
      )}
      <div className="polls-main">
      <header className={polls.length > 0 ? 'page-head' : undefined}>
        {/* The topic's picture, big: the page says what it is before you read (an empty topic shows it in its empty picture instead). */}
        {polls.length > 0 && <span className="topic-hero" style={{ '--tone': topicTone(category) } as React.CSSProperties} aria-hidden>{(() => { const I = topicIcon(category); return <I size={28} strokeWidth={1.75} />; })()}</span>}
        {/* Empty: the empty picture says the topic already ("No Cricket polls yet"), so the title stays for screen readers only. */}
        <h1 className={polls.length > 0 ? 'display' : 'sr-only'}>{t.topicTitle(t.categories[category] ?? category)}</h1>
        {/* P3: put this topic first on Home (this phone only). */}
        <p className="topic-follow"><FollowTopic topic={category} /> <span className="small muted">{t.followNote}</span></p>
      </header>
      {/* Same order as Polls: waiting for your vote, then the ones you voted on, then ended ones you missed. */}
      {filtered && <PollFilter base={`/topic/${category}`} show={show} t={t} counts={{ to: toVote.length, voted: done.length, ended: ended.length }} />}
      {!on('to') ? null : toVote.length > 0 || !full ? (
        <section className="al-block">
          {(done.length > 0 || ended.length > 0) && <h2 className="al-block__title">{t.pollsToVote}<span className="al-block__aside">{t.pollsN(toVote.length)}</span></h2>}
          <DuelTiles from="polls" polls={toVote} votedIds={mine} topic={category} limit={LIST_FIRST} />
        </section>
      ) : (
        <section className="al-block">
          <p className="lead all-voted">{t.allVotedTitle}</p>
          <QuickAsk heading={t.askTurn} ideas={t.ideaSets[category] ?? []} category={category} />
        </section>
      )}
      {on('voted') && done.length > 0 && (
        <section className="al-block">
          <h2 className="al-block__title">{t.pollsVoted}<span className="al-block__aside">{t.pollsN(done.length)}</span></h2>
          <DuelTiles from="polls" polls={done} votedIds={mine} noCreate limit={LIST_FIRST} />
        </section>
      )}
      {on('ended') && ended.length > 0 && (
        <section className="al-block">
          <h2 className="al-block__title">{t.pollsEnded}<span className="al-block__aside">{t.pollsN(ended.length)}</span></h2>
          <DuelTiles from="polls" polls={ended} votedIds={mine} noCreate limit={LIST_FIRST} />
        </section>
      )}
      {filtered && show !== 'to' && (show === 'voted' ? done : ended).length === 0 && <p className="small muted">{t.filterNone}</p>}
      </div>
    </div>
  );
}
