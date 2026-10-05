import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Eye } from 'lucide-react';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { makerView } from '@/lib/maker';
import { MILESTONE } from '@/lib/push';
import { getLang, getT } from '@/lib/lang-server';
import EmptyState from '@/components/EmptyState';
import { YouSignIn } from '@/components/Profile';
import { AskAgainRow, FixTypo, Lengths, MarkOutcome, MilestoneAlert, ResultsCard, ShareLink, Suggestions } from '@/components/MakerTools';
import { INDIA_TZ, dateLocale, monthStyle } from '@/lib/time';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).manageTitle, robots: { index: false, follow: false } };
}

// The poll maker's page (docs/DESIGN.md, "Poll maker tools"). P1: how it's going (votes, the last day, where votes
// came from), with sharing as the one main action. Then the results picture once the result is public, suggested
// choices, how long it runs, fix a typo (before the first vote), ask again, and the first-votes alert.
export default async function ManagePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const { id } = await params;
  const { done } = await searchParams;
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
  const srcTotal = v.sources.reduce((s, x) => s + x.n, 0);
  return (
    <div className="page">
      <header className="page-head page-head-tight">
        <p className="eyebrow"><Clock size={13} strokeWidth={2} aria-hidden />{v.closed ? t.statusEnded : v.endsAt ? t.statusEnds(when) : t.statusOpenNoEnd}</p>
        <h1 className="display maker-title">{v.title}</h1>
        <Link href={`/p/${v.id}`} className="text-link small"><Eye size={14} strokeWidth={2} aria-hidden /> {t.openPoll}</Link>
        {/* What just changed, said once at the top. */}
        {done === 'end' && <p className="small duel-friend" role="status">{t.endedNow}</p>}
        {done === 'length' && v.endsAt && !v.closed && <p className="small duel-friend" role="status">{t.lengthSaved(when)}</p>}
        {done === 'outcome' && <p className="small duel-friend" role="status">{t.outcomeSaved}</p>}
      </header>

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
        {!v.closed && <ShareLink id={v.id} title={v.title} />}
      </section>

      <section className="al-block" aria-label={t.resultsCard}>
        <h2 className="al-block__title">{t.resultsCard}</h2>
        {v.resultsPublic ? <ResultsCard id={v.id} votes={v.votes + v.options.length} /> : (
          <p className="small muted">{t.resultsCardLater} {!v.closed && <>{t.endToPicture} <Link href={`/p/${v.id}`} className="text-link">{t.voteToSee}</Link></>}</p>
        )}
      </section>

      {v.pending.length > 0 && (
        <section className="al-block" aria-label={t.suggested}>
          <h2 className="al-block__title">{t.suggested}<span className="al-block__aside">{v.pending.length}</span></h2>
          <p className="small muted">{t.suggestedLine}</p>
          <Suggestions id={v.id} items={v.pending} />
        </section>
      )}

      {!v.closed && (
        <section className="al-block" aria-label={t.lengthTitle}>
          <h2 className="al-block__title">{t.lengthTitle}</h2>
          <Lengths id={v.id} />
        </section>
      )}

      <section className="al-block">
        <ul className="al-listcard">
          {v.canEdit && <li><FixTypo view={v} /></li>}
          {!v.closed && v.votes < MILESTONE && <li><MilestoneAlert id={v.id} n={MILESTONE} /></li>}
          <li><AskAgainRow id={v.id} /></li>
        </ul>
      </section>
    </div>
  );
}
