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
  const hot = polls.filter((p) => !p.closed && p.lastHour > 0).sort((a, b) => b.lastHour - a.lastHour).slice(0, 3);
  const rest = polls.filter((p) => !hot.includes(p));
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
      {/* P2: the duels with the most votes in the last hour, like TV's "hot seats". Not repeated in the list below. */}
      {hot.length > 0 && (
        <section className="block">
          <h2>{t.mostWatched}</h2>
          <DuelTiles polls={hot} votedIds={mine.map((v) => v.pollId)} noCreate />
        </section>
      )}
      <section className="block">
        {/* A heading only when something sits above; otherwise it would just repeat the page title. */}
        {((featured && featured.myVote === null) || hot.length > 0) && <h2>{t.allDuels}</h2>}
        <DuelTiles polls={rest} votedIds={mine.map((v) => v.pollId)} />
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
