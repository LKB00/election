import { topicIcon, topicTone } from '@/lib/topicIcons';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DuelBanner from '@/components/DuelBanner';
import DuelTiles from '@/components/DuelTiles';
import { getDb } from '@/db';
import { CATEGORIES } from '@/lib/categories';
import { getFeaturedId, getMyVotes, getPoll, listPolls } from '@/lib/polls';
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
// P1: the duel of the day when it is in this topic. P2: the tiles.
export default async function Topic({ params }: Props) {
  const { category } = await params;
  if (!isCategory(category)) notFound();
  const db = await getDb();
  const t = await getT();
  const voterId = await readVoterId();
  const featuredId = await getFeaturedId(db);
  const [featured, polls, mine] = await Promise.all([
    featuredId ? getPoll(db, featuredId, voterId) : Promise.resolve(null),
    listPolls(db, 60, { category }),
    getMyVotes(db, voterId, 200),
  ]);
  const banner = featured && featured.category === category ? featured : null;
  const full = polls.length > 0 || !!banner;
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
      </header>
      {banner && (
        <section className="block block-tight">
          <DuelBanner poll={banner} />
        </section>
      )}
      <section className="al-block">
        <DuelTiles polls={polls} votedIds={mine.map((v) => v.pollId)} topic={category} limit={12} />
      </section>
      </div>
    </div>
  );
}
