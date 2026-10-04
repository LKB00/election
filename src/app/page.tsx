import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import DuelGame from '@/components/DuelGame';
import EmptyState from '@/components/EmptyState';
import RulesNotice from '@/components/RulesNotice';
import DuelTiles from '@/components/DuelTiles';
import PackRows from '@/components/PackRows';
import { upcomingPacks } from '@/lib/packs';
import { getDb } from '@/db';
import { getDeck, getFeaturedId, getTodaySet, listPolls, trendingPolls } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';
import { getLang, getT, langAlternates } from '@/lib/lang-server';

export const dynamic = 'force-dynamic';

// The bare site link is the one shared most, so it gets a preview card too: today's duel.
export async function generateMetadata(): Promise<Metadata> {
  const featured = await getFeaturedId(await getDb());
  const images = featured ? [{ url: `/api/og/${featured}`, width: 1200, height: 630 }] : undefined;
  return {
    alternates: await langAlternates('/'),
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
  // Today's set (the same few polls for everyone today, with an end), then more polls only if you ask for them.
  const [deck, extra, recent, todayId, trending] = await Promise.all([getTodaySet(db, voterId), getDeck(db, voterId), listPolls(db, 40), getFeaturedId(db), trendingPolls(db, 4)]);
  const [tonight, lang] = await Promise.all([upcomingPacks(db), getLang()]);
  const more = extra.filter((p) => !deck.some((d) => d.id === p.id));
  const voted = [...deck, ...more].filter((p) => p.myVote !== null).map((p) => p.id);
  // P2 shelves under today's question: what is hot right now, then two topics with the most open polls.
  // Each poll shows once on Home: today's set first, then trending, topic shelves and "More polls" without repeats.
  const inDeck = new Set(deck.map((p) => p.id));
  const hot = trending.filter((p) => !inDeck.has(p.id));
  const shown = new Set([...inDeck, ...hot.map((p) => p.id)]);
  const byTopic = new Map<string, typeof recent>();
  for (const p of recent) if (!p.closed && !shown.has(p.id) && p.category !== 'general') byTopic.set(p.category, [...(byTopic.get(p.category) ?? []), p]);
  const shelves = [...byTopic.entries()]
    .filter(([, ps]) => ps.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 2)
    .map(([cat, ps]) => [cat, ps.slice(0, 4)] as const);
  const shelved = new Set([...shown, ...shelves.flatMap(([, ps]) => ps.map((p) => p.id))]);
  const polls = recent.filter((p) => !shelved.has(p.id) && !p.closed).slice(0, 5);

  // Arogya Line's Today header: the date and a greeting. The size of the day ("4 left today") sits once, in today's
  // question label just below, where it updates as you vote (it used to be said twice).

  return (
    <div className="page page-wide">
      <header className="al-home">
        <p className="al-home__date" suppressHydrationWarning>{t.homeDate(new Date())}</p>
        <p className="al-home__title">{t.homeHello}</p>
      </header>
      {deck.length > 0 && (
        <section className="home-game duel-first" aria-label="Duel">
          <DuelGame deck={deck} todayId={todayId} daily more={more} />
        </section>
      )}
      {/* Empty: nothing open today (a new site, or a quiet day). */}
      {deck.length === 0 && (
        <section className="block">
          <EmptyState kind="invite" title={t.homeEmptyTitle} line={t.homeEmptyLine} action={{ href: '/create', label: t.startDuel }} />
        </section>
      )}

      {/* P2: tonight's match-day and show-night packs, before predictions close. */}
      {tonight.length > 0 && (
        <section className="al-block">
          <h2 className="al-block__title">{t.tonight}</h2>
          <PackRows packs={tonight} t={t} lang={lang} />
        </section>
      )}

      {hot.length > 0 && (
        <section className="al-block">
          <h2 className="al-block__title">{t.trendingNow}<span className="al-block__aside">{t.pollsN(hot.length)}</span></h2>
          <DuelTiles polls={hot} votedIds={voted} noCreate />
        </section>
      )}
      {shelves.map(([cat, ps]) => (
        <section className="al-block" key={cat}>
          <h2 className="al-block__title">
            {t.categories[cat] ?? cat}
            <Link href={`/topic/${cat}`} className="al-block__aside">{t.allDuels} <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></Link>
          </h2>
          <DuelTiles polls={ps} votedIds={voted} noCreate />
        </section>
      ))}
      {/* Only when there is something left to show (an empty list here would repeat the empty state above). */}
      {polls.length > 0 && (
        <section className="al-block">
          <h2 className="al-block__title">
            {t.moreDuels}
            <Link href="/polls" className="al-block__aside">{t.allDuels} <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></Link>
          </h2>
          <DuelTiles polls={polls} votedIds={voted} />
        </section>
      )}
      {/* P3: the 3-monthly rules reminder sits last, after everything there is to do. */}
      <RulesNotice />
    </div>
  );
}
