import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import DuelGame from '@/components/DuelGame';
import DuelTiles from '@/components/DuelTiles';
import { getDb } from '@/db';
import { getDeck, getFeaturedId, listPolls } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';
import { getT } from '@/lib/lang-server';

export const dynamic = 'force-dynamic';

// The bare site link is the one shared most, so it gets a preview card too: today's duel.
export async function generateMetadata(): Promise<Metadata> {
  const featured = await getFeaturedId(await getDb());
  const images = featured ? [{ url: `/api/og/${featured}`, width: 1200, height: 630 }] : undefined;
  return {
    alternates: { canonical: '/' },
    openGraph: { title: 'Election · Who would you pick?', description: 'Vote in one tap and see where everyone stands. Just for fun.', images },
    twitter: { card: 'summary_large_image', images: images?.map((i) => i.url) },
  };
}

// Home = vote in one tap. Nothing sits above the duel: the question is the first thing you read.
// The why for every element is in docs/DESIGN.md (Flow 1).
export default async function Home() {
  const db = await getDb();
  const t = await getT();
  const voterId = await readVoterId();
  const [deck, polls] = await Promise.all([getDeck(db, voterId), listPolls(db, 8)]);
  const voted = deck.filter((p) => p.myVote !== null).map((p) => p.id);

  return (
    <div className="page page-wide">
      {deck.length > 0 && (
        <section className="home-game duel-first" aria-label="Duel">
          <DuelGame deck={deck} />
        </section>
      )}

      <section className="block">
        <div className="row space-between">
          <h2>{t.moreDuels}</h2>
          <Link href="/duels" className="text-link">{t.allDuels} <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></Link>
        </div>
        <DuelTiles polls={polls} votedIds={voted} />
      </section>
    </div>
  );
}
