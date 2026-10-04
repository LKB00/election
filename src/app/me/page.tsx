import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ChevronRight, Vote } from 'lucide-react';
import { getDb } from '@/db';
import { getMyVotes, getVoterStats, listPolls, type Standing } from '@/lib/polls';
import type { Dict } from '@/lib/i18n';
import { readVoterId, voterKeyForLink } from '@/lib/voter';
import KeepVotes from '@/components/KeepVotes';
import ResetFresh from '@/components/ResetFresh';
import SinceLastLook from '@/components/SinceLastLook';
import MonthCard from '@/components/MonthCard';
import { getMonth } from '@/lib/month';
import Spot from '@/components/Spot';
import { getT } from '@/lib/lang-server';

export const dynamic = 'force-dynamic';

const standingText = (t: Dict, s: Standing): string | null =>
  s.kind === 'leading' ? t.meLeading(s.name, s.percent)
  : s.kind === 'won' ? t.meWon(s.name)
  : s.kind === 'group' ? t.meGroupWaiting(s.voted, s.of)
  : s.kind === 'called' ? (s.right ? t.meCalledRight(s.name) : t.meCalledWrong(s.name))
  : s.kind === 'rating' ? t.meRating(s.average.toFixed(1))
  : s.kind === 'tie' ? t.meTie
  : s.kind === 'tied' ? t.meTied
  : s.kind === 'guess' ? t.meGuess
  : s.kind === 'sealed' ? t.meSealed
  : null;
export const metadata: Metadata = { title: 'My votes' };

// My votes = your voting record on this phone. No levels or points: nothing here that a real election does not have.
export default async function MyVotes({ searchParams }: { searchParams: Promise<{ restored?: string; deleted?: string; swap?: string }> }) {
  const { restored, deleted, swap } = await searchParams;
  const db = await getDb();
  const voterId = await readVoterId();
  const voterKey = await voterKeyForLink();
  const [stats, mine, month, open] = await Promise.all([getVoterStats(db, voterId), getMyVotes(db, voterId), getMonth(db, voterId), listPolls(db, 1)]);
  const t = await getT();

  return (
    <div className="page">
      <header className="page-head page-head-tight">
        <h1 className="sr-only">{t.myVotes}</h1>
        {(restored || deleted) && <p className="small duel-friend" role="status">{restored ? t.restored : t.deleted}</p>}
        {/* A "keep my votes" link opened on a phone that has its own votes: ask before replacing them. */}
        {swap && (
          <form method="post" action="/api/me/restore" className="duel-group">
            <p className="small">{t.restoreAsk}</p>
            <input type="hidden" name="k" value={swap} />
            <span className="row wrap">
              <button type="submit" className="btn btn-primary">{t.restoreYes}</button>
              <Link href="/me" className="btn btn-ghost">{t.restoreNo}</Link>
            </span>
          </form>
        )}
        {stats.votes > 0 && (
          <p className="lead">{t.record(stats.votes, stats.friends)}</p>
        )}
      </header>

      {/* P2: your month, described (3+ votes this month). */}
      {month && month.polls >= 3 && (
        <section className="block block-tight">
          <MonthCard m={month} />
        </section>
      )}
      <section className="block">
        {mine.length === 0 ? (
          <div className="spot-empty">
            <Spot kind="finger" />
            <p><strong>{t.noVotes}</strong> {t.spotNoVotes}</p>
            {/* Nothing to vote on yet: the next step is making the first poll. */}
            {open.length > 0 ? <Link href="/" className="btn btn-primary">{t.startToday}</Link> : <Link href="/create" className="btn btn-primary">{t.startDuel}</Link>}
          </div>
        ) : (
          <ul className="al-listcard block-tight">
            {mine.map((v) => {
              // Your pick in front (or won): the yellow disc of "you" with a tick; otherwise a quiet disc.
              // A "Called it" you got right counts as ahead too.
              const ahead = ((v.standing.kind === 'leading' || v.standing.kind === 'won') && v.standing.name === v.pick) || (v.standing.kind === 'called' && v.standing.right);
              return (
                <li key={v.pollId}>
                  <Link href={`/p/${v.pollId}`} className="al-row">
                    <span className="al-row__disc" style={{ '--tone': ahead ? 'var(--lime)' : 'var(--sand)' } as React.CSSProperties}>
                      {ahead ? <Check size={20} strokeWidth={2} aria-hidden /> : <Vote size={20} strokeWidth={1.75} aria-hidden />}
                    </span>
                    <span className="al-row__main">
                      <span className="al-row__title">{v.title}</span>
                      <span className="al-row__meta">{t.youPicked(v.pick)}</span>
                      {/* Where it stands now: a reason to come back (same visibility rules as the poll itself). */}
                      {standingText(t, v.standing) && <span className="al-row__meta">{standingText(t, v.standing)}</span>}
                      {/* What changed since you last looked (this phone only). */}
                      <SinceLastLook pollId={v.pollId} voters={v.voters} lead={v.standing.kind === 'leading' || v.standing.kind === 'won' ? v.standing.name : null} />
                    </span>
                    <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="small muted block-tight">{t.deviceOnly}</p>
      </section>
      {mine.length > 0 && <KeepVotes voterKey={voterKey} />}
      {/* TEMPORARY: the owner's "start fresh" for testing (remove before a public launch). */}
      <ResetFresh />
      <p className="small block row wrap">
        <Link href="/terms" className="text-link">{t.termsLink}</Link>
        <Link href="/privacy" className="text-link">{t.privacyLink}</Link>
      </p>
    </div>
  );
}
