import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Clock, Eye } from 'lucide-react';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { makerView } from '@/lib/maker';
import { MILESTONE } from '@/lib/push';
import { getLang, getT } from '@/lib/lang-server';
import EmptyState from '@/components/EmptyState';
import { YouSignIn } from '@/components/Profile';
import { AskAgainRow, FixTypo, Lengths, MilestoneAlert, ResultsCard, ShareLink, Suggestions } from '@/components/MakerTools';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your poll', robots: { index: false, follow: false } };

// The poll maker's page (docs/DESIGN.md, "Poll maker tools"). P1: how it's going (votes, the last day, where votes
// came from), with sharing as the one main action. Then the results picture once the result is public, suggested
// choices, how long it runs, fix a typo (before the first vote), ask again, and the first-votes alert.
export default async function ManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const [user, t, lang] = await Promise.all([currentUser(db), getT(), getLang()]);
  if (!user) {
    return (
      <div className="page">
        <section className="block"><YouSignIn full /></section>
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
  const when = v.endsAt ? new Date(v.endsAt).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '';
  const peak = Math.max(1, ...v.byHour);
  const srcTotal = v.sources.reduce((s, x) => s + x.n, 0);
  return (
    <div className="page">
      <header className="page-head page-head-tight">
        <p className="eyebrow"><Clock size={13} strokeWidth={2} aria-hidden />{v.closed ? t.statusEnded : v.endsAt ? t.statusEnds(when) : t.statusOpenNoEnd}</p>
        <h1 className="display maker-title">{v.title}</h1>
        <Link href={`/p/${v.id}`} className="text-link small"><Eye size={14} strokeWidth={2} aria-hidden /> {t.openPoll}</Link>
      </header>

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
        {v.resultsPublic ? <ResultsCard id={v.id} votes={v.votes + v.options.length} /> : <p className="small muted">{t.resultsCardLater}</p>}
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
          <li>
            <Link href={`/p/${v.id}`} className="al-row">
              <span className="al-row__disc" style={{ '--tone': 'var(--p-input)' } as React.CSSProperties}><Eye size={20} strokeWidth={1.75} aria-hidden /></span>
              <span className="al-row__main"><span className="al-row__title">{t.openPoll}</span></span>
              <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
