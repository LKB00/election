import type { Metadata } from 'next';
import Link from 'next/link';
import DuelBanner from '@/components/DuelBanner';
import DuelTiles from '@/components/DuelTiles';
import { getDb } from '@/db';
import { getFeaturedId, getMyVotes, getPoll, listPolls } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';
import { getT } from '@/lib/lang-server';
import { CATEGORIES } from '@/lib/categories';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Duels' };

// P1: the duel of the day (dark banner). P2: browse the tiles.
export default async function Duels() {
  const db = await getDb();
  const t = await getT();
  const voterId = await readVoterId();
  const featuredId = await getFeaturedId(db);
  const [featured, polls, mine] = await Promise.all([
    featuredId ? getPoll(db, featuredId, voterId) : Promise.resolve(null),
    listPolls(db, 60),
    getMyVotes(db, voterId, 200),
  ]);
  return (
    <div className="page page-wide">
      <header className="page-head">
        <h1 className="display">{t.duels}</h1>
        <p className="lead">{t.duelsLead}</p>
      </header>
      {/* Not voted yet: the duel of the day is the main thing here. Voted: it steps back below the duels you have not done. */}
      {featured && featured.myVote === null && (
        <section className="block block-tight">
          <DuelBanner poll={featured} />
        </section>
      )}
      <section className="block">
        {/* A heading only when the banner sits above; otherwise it would just repeat the page title. */}
        {featured && featured.myVote === null && <h2>{t.allDuels}</h2>}
        <DuelTiles polls={polls} votedIds={mine.map((v) => v.pollId)} />
      </section>
      {featured && featured.myVote !== null && (
        <section className="block">
          <DuelBanner poll={featured} />
        </section>
      )}
      {/* P3: browse by topic (also how search engines find the topic pages). */}
      <section className="block">
        <h2>{t.topics}</h2>
        <nav className="topic-chips block-tight" aria-label={t.topics}>
          {CATEGORIES.map((c) => (
            <Link key={c} href={`/topic/${c}`} className="chip">{t.categories[c] ?? c}</Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
