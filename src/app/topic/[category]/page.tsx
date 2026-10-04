import { topicIcon, topicTone } from '@/lib/topicIcons';
import type { Metadata } from 'next';
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
  if (!isCategory(category)) return { title: 'Poll not found' };
  const t = await getT();
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
  return (
    <div className="page page-wide">
      <header className="page-head">
        {/* The topic's picture, big: the page says what it is before you read (an empty topic shows it in its empty picture instead). */}
        {polls.length > 0 && <span className="topic-hero" style={{ '--tone': topicTone(category) } as React.CSSProperties} aria-hidden>{(() => { const I = topicIcon(category); return <I size={28} strokeWidth={1.75} />; })()}</span>}
        <h1 className="display">{t.topicTitle(t.categories[category] ?? category)}</h1>
        <p className="lead">{t.topicLead}</p>
      </header>
      {banner && (
        <section className="block block-tight">
          <DuelBanner poll={banner} />
        </section>
      )}
      <section className="al-block">
        <DuelTiles polls={polls} votedIds={mine.map((v) => v.pollId)} topic={category} />
      </section>
    </div>
  );
}
