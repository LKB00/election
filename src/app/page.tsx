import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import DuelGame from '@/components/DuelGame';
import EmptyState from '@/components/EmptyState';
import Onboarding from '@/components/Onboarding';
import PeopleCount from '@/components/PeopleCount';
import Step from '@/components/Step';
import RulesNotice from '@/components/RulesNotice';
import DuelTiles from '@/components/DuelTiles';
import PackRows from '@/components/PackRows';
import { upcomingPacks } from '@/lib/packs';
import { getDb } from '@/db';
import { getDeck, getFeaturedId, getTodaySet, listPolls, trendingPolls, voterCount } from '@/lib/polls';
import { VIEWS_SHOW_MIN, VOTERS_SHOW_MIN } from '@/lib/limits';
import { viewTotal } from '@/lib/events';
import { dateLocale } from '@/lib/time';
import { readVoterId } from '@/lib/voter';
import { ogBase, siteImage } from '@/lib/og';
import { getLang, getT, langAlternates } from '@/lib/lang-server';

export const dynamic = 'force-dynamic';

// The bare site link is the one shared most: the brand picture (what Chunav is, and a Start voting button), the same
// every day, so a chat's saved preview never shows a poll that has ended.
export async function generateMetadata(): Promise<Metadata> {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return {
    alternates: await langAlternates('/'),
    openGraph: { ...ogBase(lang), title: `${t.siteName} · ${t.splashLine}`, description: t.metaDesc, images: [siteImage(lang)] },
    twitter: { card: 'summary_large_image', images: [siteImage(lang).url] },
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
  const [tonight, lang, voters, viewed] = await Promise.all([upcomingPacks(db), getLang(), voterCount(db), viewTotal(db)]);
  const more = extra.filter((p) => !deck.some((d) => d.id === p.id));
  // Every vote came with a page view too (views were counted later than votes), so never show fewer views than voters.
  const fmt = (n: number) => n.toLocaleString(dateLocale(lang));
  const views = Math.max(viewed, voters);
  const people = views >= VIEWS_SHOW_MIN && <PeopleCount views={views} voted={voters >= VOTERS_SHOW_MIN ? voters : null} fmt={fmt} t={t} />;
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

  // An empty site shows only its empty state: no greeting, no rules reminder (nothing to be kind about yet).
  const empty = deck.length === 0 && !tonight.length && !hot.length && !shelves.length && !polls.length;
  // The first time a phone opens Home (or the first time since a new onboarding version): the splash, then three short
  // cards. Decided on the phone (it remembers having seen them). Never on a shared poll link.
  return (
    <div className="page page-wide">
      <Onboarding />
      <Step e="home_view" />
      {/* Phones: one column, top to bottom. Computers (election.css, "Desktop"): today's poll on the left as the main
          thing, everything else to browse in a column on the right, so the screen is not one stretched card. */}
      <div className={'home-grid' + (empty ? '' : ' has-rail')}>
        <div className="home-main">
          {!empty && (
            <header className="al-home">
              <p className="al-home__title">{t.homeHello}</p>
            </header>
          )}
          {deck.length > 0 && (
            <section className="home-game duel-first" aria-label={t.pollRegion}>
              <DuelGame deck={deck} todayId={todayId} daily more={more} />
            </section>
          )}
          {/* Empty: nothing open today (a new site, or a quiet day). */}
          {deck.length === 0 && (
            <section className={empty ? 'empty-page' : 'block'}>
              <EmptyState kind="invite" title={t.homeEmptyTitle} line={t.homeEmptyLine} action={{ href: '/create', label: t.startDuel }} />
            </section>
          )}
        </div>
        {!empty && (
          <div className="home-rail">
            {/* P2: tonight's match-day and show-night packs, before predictions close. */}
            {tonight.length > 0 && (
              <section className="al-block">
                <h2 className="al-block__title">{t.tonight}</h2>
                <PackRows packs={tonight} t={t} lang={lang} />
              </section>
            )}
            {hot.length > 0 && (
              <section className="al-block">
                <h2 className="al-block__title"><span className="live-dot al-block__live" aria-hidden />{t.trendingNow}<span className="al-block__aside">{t.pollsN(hot.length)}</span></h2>
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
          </div>
        )}
      </div>
      {/* P3 social proof at the bottom: how many times pages here were opened, and how many people voted (each counted
          once; votes are never linked to a person). */}
      {people}
      {/* P3: the 3-monthly rules reminder sits last, after everything there is to do. */}
      {!empty && <RulesNotice />}
    </div>
  );
}
