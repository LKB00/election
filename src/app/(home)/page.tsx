import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import DuelGame from '@/components/DuelGame';
import EmptyState from '@/components/EmptyState';
import QuickAsk from '@/components/QuickAsk';
import Onboarding from '@/components/Onboarding';
import PeopleCount from '@/components/PeopleCount';
import Step from '@/components/Step';
import RulesNotice from '@/components/RulesNotice';
import MadeBy from '@/components/MadeBy';
import DuelTiles from '@/components/DuelTiles';
import PackRows from '@/components/PackRows';
import { upcomingPacks } from '@/lib/packs';
import { getDb } from '@/db';
import { cookies } from 'next/headers';
import { advanceDueBattles } from '@/lib/battles';
import { FOLLOW_COOKIE, readFollowed } from '@/lib/follow';
import { freshPollIds, getTodaySet, myPollNews, popularToday, recentVoteCount, topVotedTopic, rollDueSeries, listPolls, trendingPolls, voterCount } from '@/lib/polls';
import { FRESH_SHOW, VIEWS_SHOW_MIN, VOTERS_SHOW_MIN } from '@/lib/limits';
import { viewTotal } from '@/lib/events';
import { dateLocale } from '@/lib/time';
import { readVoterId } from '@/lib/voter';
import { currentUser } from '@/lib/auth';
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
  // Weekly polls that ended open their next week first, so they are in today's lists.
  await Promise.all([rollDueSeries(db).catch(() => 0), advanceDueBattles(db).catch(() => 0)]);
  // Today's set (the same few polls for everyone today, with an end), then more polls only if you ask for them.
  // The polls offered after today's set are fetched by the phone when the set is done (DuelGame), not here.
  const [deck, recent, trending, user] = await Promise.all([getTodaySet(db, voterId), listPolls(db, 40), trendingPolls(db, 4), currentUser(db)]);
  // The ask card's proof: how your own poll did today, else one poll that took off today (never yours, never a name).
  const uid = user?.id ?? null;
  const [tonight, lang, voters, viewed, recentVotes, votedTopic, mineNews, popular, freshIds] = await Promise.all([upcomingPacks(db), getLang(), voterCount(db), viewTotal(db), recentVoteCount(db), topVotedTopic(db, voterId), myPollNews(db, uid), popularToday(db, uid), freshPollIds(db, voterId, uid)]);
  // Every vote came with a page view too (views were counted later than votes), so never show fewer views than voters.
  const fmt = (n: number) => n.toLocaleString(dateLocale(lang));
  const views = Math.max(viewed, voters);
  const people = views >= VIEWS_SHOW_MIN && <PeopleCount views={views} voted={voters >= VOTERS_SHOW_MIN ? voters : null} fmt={fmt} t={t} />;
  const voted = deck.filter((p) => p.myVote !== null).map((p) => p.id);
  // P2 shelves under today's set: what is hot right now, then two topics with the most open polls.
  // Each poll shows once on Home: today's set first, then trending, topic shelves and "More polls" without repeats.
  const inDeck = new Set(deck.map((p) => p.id));
  const hot = trending.filter((p) => !inDeck.has(p.id));
  // New polls that have almost no votes yet (never yours, never one you voted on): a new maker's first votes.
  const fresh = freshIds.map((id) => recent.find((p) => p.id === id)).filter((p): p is (typeof recent)[number] => !!p && !p.closed && !inDeck.has(p.id) && !hot.some((h) => h.id === p.id)).slice(0, FRESH_SHOW);
  const shown = new Set([...inDeck, ...hot.map((p) => p.id), ...fresh.map((p) => p.id)]);
  const byTopic = new Map<string, typeof recent>();
  for (const p of recent) if (!p.closed && !shown.has(p.id) && p.category !== 'general') byTopic.set(p.category, [...(byTopic.get(p.category) ?? []), p]);
  // Topics this phone follows come first (with even one open poll), then the busiest others (two or more).
  const followed = readFollowed((await cookies()).get(FOLLOW_COOKIE)?.value);
  const askTopic = votedTopic ?? followed[0] ?? 'general';
  const mineFirst = followed.filter((c) => byTopic.has(c)).map((c) => [c, byTopic.get(c)!] as const);
  const others = [...byTopic.entries()].filter(([c, ps]) => !followed.includes(c) && ps.length >= 2).sort((a, b) => b[1].length - a[1].length);
  const shelves = [...mineFirst, ...others]
    .slice(0, Math.max(2, mineFirst.length))
    .map(([cat, ps]) => [cat, ps.slice(0, 4)] as const);
  const shelved = new Set([...shown, ...shelves.flatMap(([, ps]) => ps.map((p) => p.id))]);
  const polls = recent.filter((p) => !shelved.has(p.id) && !p.closed).slice(0, 5);

  // Arogya Line's Today header: the date and a greeting. The size of the day ("4 left today") sits once, in today's
  // question label just below, where it updates as you vote (it used to be said twice).

  // An empty site shows only its empty state: no greeting, no rules reminder (nothing to be kind about yet).
  const empty = deck.length === 0 && !tonight.length && !hot.length && !fresh.length && !shelves.length && !polls.length;
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
          {deck.length > 0 && (
            <section className="home-game duel-first" aria-label={t.pollRegion}>
              <DuelGame deck={deck} daily />
            </section>
          )}
          {/* Empty: nothing open today (a new site, or a quiet day). */}
          {deck.length === 0 && (
            <section className={empty ? 'empty-page' : 'block'}>
              <EmptyState kind="invite" title={t.homeEmptyTitle} line={t.homeEmptyLine} />
            </section>
          )}
          {/* P2, under the poll: "Ask anything" (owner, Oct 2026: "something which pushes them to create a poll"; every
              poll comes from people). Ideas from what you vote on most (owner: "depend on what they have done"), else
              a topic you follow, else everyday ones. */}
          <QuickAsk ideas={t.ideaSets[askTopic] ?? t.ideaSets.general} category={askTopic} recentVotes={recentVotes} signedIn={!!user} mine={mineNews} popular={popular} />
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
            {/* P2: "New: be the first to answer". A poll with no votes looks dead to its maker; a few here fix that. */}
            {fresh.length > 0 && (
              <section className="al-block">
                <h2 className="al-block__title">{t.freshTitle}<span className="al-block__aside">{t.freshLine}</span></h2>
                <DuelTiles polls={fresh} votedIds={voted} noCreate />
              </section>
            )}
            {shelves.map(([cat, ps]) => (
              <section className="al-block" key={cat}>
                <h2 className="al-block__title">
                  {t.categories[cat] ?? cat}
                  {followed.includes(cat) && <span className="al-chip is-you shelf-followed">{t.followedTag}</span>}
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
      {/* P3, the very last line: who made Chunav. */}
      <MadeBy t={t} />
    </div>
  );
}
