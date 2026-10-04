import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import DuelGame from '@/components/DuelGame';
import RulesNotice from '@/components/RulesNotice';
import DuelTiles from '@/components/DuelTiles';
import { getDb } from '@/db';
import { getDeck, getFeaturedId, listPolls, trendingPolls } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';
import { getT } from '@/lib/lang-server';

export const dynamic = 'force-dynamic';

// The bare site link is the one shared most, so it gets a preview card too: today's duel.
export async function generateMetadata(): Promise<Metadata> {
  const featured = await getFeaturedId(await getDb());
  const images = featured ? [{ url: `/api/og/${featured}`, width: 1200, height: 630 }] : undefined;
  return {
    alternates: { canonical: '/' },
    openGraph: { title: 'Election · What does everyone think?', description: 'Ask anything. Vote in one tap, then see what everyone thinks. Just for fun.', images },
    twitter: { card: 'summary_large_image', images: images?.map((i) => i.url) },
  };
}

// Home = vote in one tap. Nothing sits above the duel: the question is the first thing you read.
// The why for every element is in docs/DESIGN.md (Flow 1).
export default async function Home() {
  const db = await getDb();
  const t = await getT();
  const voterId = await readVoterId();
  const [deck, recent, todayId, trending] = await Promise.all([getDeck(db, voterId), listPolls(db, 40), getFeaturedId(db), trendingPolls(db, 4)]);
  const voted = deck.filter((p) => p.myVote !== null).map((p) => p.id);
  // P2 shelves under today's question: what is hot right now, then two topics with the most open polls.
  const shown = new Set(trending.map((p) => p.id));
  const byTopic = new Map<string, typeof recent>();
  for (const p of recent) if (!p.closed && !shown.has(p.id) && p.category !== 'general') byTopic.set(p.category, [...(byTopic.get(p.category) ?? []), p]);
  const shelves = [...byTopic.entries()]
    .filter(([, ps]) => ps.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 2)
    .map(([cat, ps]) => [cat, ps.slice(0, 4)] as const);
  const shelved = new Set([...shown, ...shelves.flatMap(([, ps]) => ps.map((p) => p.id))]);
  const polls = recent.filter((p) => !shelved.has(p.id)).slice(0, 8);

  return (
    <div className="page page-wide">
      {deck.length > 0 && (
        <section className="home-game duel-first" aria-label="Duel">
          <DuelGame deck={deck} todayId={todayId} />
        </section>
      )}
      <RulesNotice />

      {trending.length > 0 && (
        <section className="block">
          <h2>{t.trendingNow}</h2>
          <DuelTiles polls={trending} votedIds={voted} noCreate />
        </section>
      )}
      {shelves.map(([cat, ps]) => (
        <section className="block" key={cat}>
          <div className="row space-between">
            <h2>{t.categories[cat] ?? cat}</h2>
            <Link href={`/topic/${cat}`} className="text-link">{t.allDuels} <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></Link>
          </div>
          <DuelTiles polls={ps} votedIds={voted} noCreate />
        </section>
      ))}
      <section className="block">
        <div className="row space-between">
          <h2>{t.moreDuels}</h2>
          <Link href="/polls" className="text-link">{t.allDuels} <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></Link>
        </div>
        <DuelTiles polls={polls} votedIds={voted} />
      </section>
    </div>
  );
}
