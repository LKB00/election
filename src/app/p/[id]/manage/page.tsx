import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Eye, Sparkles } from 'lucide-react';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { makerView } from '@/lib/maker';
import { getPoll, remixCount, rollWeekly, tiedTop, weeklyTrend } from '@/lib/polls';
import { nextMilestone } from '@/lib/push';
import { getLang, getT } from '@/lib/lang-server';
import CreatedPanel from '@/components/CreatedPanel';
import EmptyState from '@/components/EmptyState';
import { YouSignIn } from '@/components/Profile';
import { AskAgainRow, FixTypo, QuietHelp, Runoff, Lengths, MarkOutcome, MilestoneAlert, ResultsCard, ShareLink, Suggestions, TvRow, PosterRow, WeeklyRow, DeletePoll } from '@/components/MakerTools';
import { INDIA_TZ, dateLocale, monthStyle } from '@/lib/time';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).manageTitle, robots: { index: false, follow: false } };
}

// The poll maker's page (docs/DESIGN.md, "Poll maker tools"). P1: how it's going (votes, the last day, where votes
// came from), with sharing as the one main action. Then the results picture once the result is public, suggested
// choices, how long it runs, fix a typo (before the first vote), ask again, and the first-votes alert.
export default async function ManagePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; new?: string; back?: string }> }) {
  const { id } = await params;
  const { done, new: isNew, back } = await searchParams;
  const db = await getDb();
  const [user, t, lang] = await Promise.all([currentUser(db), getT(), getLang()]);
  if (!user) {
    return (
      <div className="page">
        <h1 className="display">{t.manageSignIn}</h1>
        <section className="block-tight"><YouSignIn full startBack /></section>
      </div>
    );
  }
  const v = await makerView(db, id, user.id);
  if (!v) {
    return (
      <div className="page">
        <EmptyState kind="lost" title={t.notYours} action={{ href: `/p/${id}`, label: t.openPoll }} />
      </div>
    );
  }
  const when = v.endsAt ? new Date(v.endsAt).toLocaleString(dateLocale(lang), { weekday: 'short', day: 'numeric', month: monthStyle(lang), hour: 'numeric', minute: '2-digit', timeZone: INDIA_TZ }) : '';
  const peak = Math.max(1, ...v.byHour);
  // Week by week (a weekly poll, or one asked again): newest first, totals only.
  // And how many people asked their own version of it ("Ask your own version" after voting).
  const [weeks, remixes] = await Promise.all([weeklyTrend(db, v.id), remixCount(db, v.id)]);
  // An ended pick-one poll with a tie: the decider is the one thing to do (or open it, once made).
  const view = v.closed ? await getPoll(db, v.id, null, null, { noPrevious: true }) : null;
  const tied = view ? tiedTop(view) : [];
  const decider = tied.length ? await rollWeekly(db, v.id) : null;
  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: monthStyle(lang), timeZone: INDIA_TZ }) : '');
  const srcTotal = v.sources.reduce((s, x) => s + x.n, 0);
  return (
    // Computers (election.css, "Desktop"): how it is going on the left; length, tools and delete in a column beside it.
    <div className="page maker-page">
      <header className="page-head page-head-tight">
        <p className="eyebrow"><Clock size={13} strokeWidth={2} aria-hidden />{v.closed ? t.statusEnded : v.startsAt ? t.opensAt(new Date(v.startsAt).toLocaleString(dateLocale(lang), { day: 'numeric', month: monthStyle(lang), hour: 'numeric', minute: '2-digit', timeZone: INDIA_TZ })) : v.endsAt ? t.statusEnds(when) : t.statusOpenNoEnd}</p>
        <h1 className="display maker-title">{v.title}</h1>
        <Link href={`/p/${v.id}`} className="text-link small"><Eye size={14} strokeWidth={2} aria-hidden /> {t.openPoll}</Link>
        {/* What just changed, said once at the top. */}
        {done === 'end' && <p className="small duel-friend" role="status">{t.endedNow}</p>}
        {done === 'length' && v.endsAt && !v.closed && <p className="small duel-friend" role="status">{t.lengthSaved(when)}</p>}
        {done === 'outcome' && <p className="small duel-friend" role="status">{t.outcomeSaved}</p>}
      </header>

      {/* Just made (docs/DESIGN.md, "Your poll's place"): sharing is the first step, here on its own page; voting on it
          yourself is a link, never needed first. */}
      {isNew === '1' && (
        <CreatedPanel id={v.id} title={v.title} here={`/p/${v.id}/manage`} note={t.createdNoteManage} voteHref={`/p/${v.id}`} text={back === '1' ? t.askBackShare(v.title) : undefined} />
      )}
      <div className="maker-main">
      {tied.length > 0 && (
        <section className="al-block" aria-label={t.runoffTitle}>
          <h2 className="al-block__title">{t.runoffTitle}</h2>
          {decider ? (
            <Link href={`/p/${decider}`} className="btn btn-primary btn-lg">{t.runoffOpen}</Link>
          ) : (
            <Runoff id={v.id} names={tied.map((o) => o.label).join(' · ')} />
          )}
        </section>
      )}
      {/* "Called it": mark what happened (only the maker, on any phone). */}
      {v.calledOpen && (
        <section className="al-block" aria-label={t.calledMarkTitle}>
          <h2 className="al-block__title">{t.calledMarkTitle}</h2>
          <MarkOutcome id={v.id} options={v.options} />
        </section>
      )}

      {/* P1: how it's going, and the one main action (share). */}
      <section className="al-block" aria-label={t.howGoing}>
        <h2 className="al-block__title">{t.howGoing}<span className="al-block__aside">{t.votes(v.votes)}</span></h2>
        {v.votes === 0 ? (
          <p className="small muted">{t.noVotesYet}</p>
        ) : (
          <div className="card maker-stats">
            <p className="label">{t.lastDay}</p>
            <div className="maker-hours" role="img" aria-label={`${t.lastDay}: ${v.byHour.reduce((a, b) => a + b, 0)}`}>
              {v.byHour.map((n, k) => <span key={k} style={{ height: `${Math.max(4, (n / peak) * 100)}%` }} className={n ? 'is-on' : ''} />)}
            </div>
            {srcTotal > 0 && (
              <>
                <p className="label">{t.whereFrom}</p>
                <ul className="maker-sources">
                  {v.sources.map((s) => (
                    <li key={s.src}>
                      <span>{t.srcNames[s.src] ?? s.src}</span>
                      <span className="meter" aria-hidden><span style={{ width: `${(s.n / srcTotal) * 100}%` }} /></span>
                      <span className="small">{s.n}</span>
                    </li>
                  ))}
                </ul>
                <p className="small muted">{t.srcNote}</p>
              </>
            )}
          </div>
        )}
        {/* A reward that is not a number of votes: your question started others. Never their names. */}
        {remixes > 0 && <p className="small duel-friend maker-remix"><Sparkles size={14} strokeWidth={2} aria-hidden /> {t.remixed(remixes)}</p>}
        {/* It's quiet: the Status picture is the next step (the link alone has stopped bringing votes). */}
        {v.quiet && <QuietHelp id={v.id} title={v.title} votes={v.votes} />}
        {/* Just made: the panel above is the share step (one share button, not two). */}
        {!v.closed && isNew !== '1' && <ShareLink id={v.id} title={v.title} quiet={v.quiet} />}
      </section>

      {/* "The result is in" only once there is a result to share. Before the first vote there is nothing to say (the
          block used to say only "not yet"); while results are hidden it says how to open them. */}
      {(v.votes > 0 || !v.resultsPublic) && (
        <section className="al-block" aria-label={v.resultsPublic ? t.resultsCard : t.resultsCardSoon}>
          <h2 className="al-block__title">{v.resultsPublic ? t.resultsCard : t.resultsCardSoon}</h2>
          {v.resultsPublic ? <ResultsCard id={v.id} votes={v.votes + v.options.length} main={v.closed} /> : (
            <p className="small muted">{t.resultsCardLater} {!v.closed && <>{t.endToPicture} <Link href={`/p/${v.id}`} className="text-link">{t.voteToSee}</Link></>}</p>
          )}
        </section>
      )}

      {v.pending.length > 0 && (
        <section className="al-block" aria-label={t.suggested}>
          <h2 className="al-block__title">{t.suggested}<span className="al-block__aside">{v.pending.length}</span></h2>
          <p className="small muted">{t.suggestedLine}</p>
          <Suggestions id={v.id} items={v.pending} />
        </section>
      )}

      </div>
      <div className="maker-side">
      {!v.closed && (
        <section className="al-block" aria-label={t.lengthTitle}>
          <h2 className="al-block__title">{t.lengthTitle}</h2>
          <Lengths id={v.id} />
        </section>
      )}

      {weeks.length > 1 && (
        <section className="al-block" aria-label={t.weeklyTrend}>
          <h2 className="al-block__title">{t.weeklyTrend}</h2>
          <ul className="al-listcard week-trend">
            {weeks.map((w, n) => (
              <li key={w.id}>
                <Link href={`/p/${w.id}`} className="al-row">
                  <span className="al-row__main">
                    <span className="al-row__title">{n === 0 ? t.weeklyNow : day(w.endsAt)}</span>
                    <span className="al-row__meta">{w.average != null ? t.weeklyAvg(w.average) : w.leader ? `${w.leader} · ${w.percent}%` : w.voters ? '' : t.weeklyNone}{w.voters ? `${w.average != null || w.leader ? ' · ' : ''}${t.votes(w.voters)}` : ''}</span>
                  </span>
                  {w.percent != null && <span className="week-bar" aria-hidden><span style={{ width: `${w.average != null ? w.average * 20 : w.percent}%` }} /></span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="al-block">
        <ul className="al-listcard">
          {v.canRepeat && <li><WeeklyRow id={v.id} on={v.repeatWeekly} /></li>}
          {v.canEdit && <li><FixTypo view={v} /></li>}
          {!v.closed && nextMilestone(v.votes) && <li><MilestoneAlert id={v.id} n={nextMilestone(v.votes)!} /></li>}
          <li><TvRow id={v.id} /></li>
          <li><PosterRow id={v.id} /></li>
          <li><AskAgainRow id={v.id} /></li>
        </ul>
      </section>

      {/* P3, last: taking the poll down for everyone. */}
      <section className="al-block">
        <ul className="al-listcard">
          <li><DeletePoll id={v.id} /></li>
        </ul>
      </section>
      </div>
    </div>
  );
}
