import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getDb } from '@/db';
import { getMyVotes, getVoterStats, type Standing } from '@/lib/polls';
import type { Dict } from '@/lib/i18n';
import { readVoterId, voterKeyForLink } from '@/lib/voter';
import KeepVotes from '@/components/KeepVotes';
import ResetFresh from '@/components/ResetFresh';
import { getT } from '@/lib/lang-server';

export const dynamic = 'force-dynamic';

const standingText = (t: Dict, s: Standing): string | null =>
  s.kind === 'leading' ? t.meLeading(s.name, s.percent)
  : s.kind === 'won' ? t.meWon(s.name)
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
  const [stats, mine] = await Promise.all([getVoterStats(db, voterId), getMyVotes(db, voterId)]);
  const t = await getT();

  return (
    <div className="page">
      <header className="page-head page-head-tight">
        <h1 className="display">{t.myVotes}</h1>
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
          <p className="lead">{t.record(stats.votes, stats.guesses, stats.correct, stats.friends)}</p>
        )}
      </header>

      <section className="block">
        {mine.length === 0 ? (
          <p className="muted">{t.noVotes} <Link href="/" className="text-link">{t.startToday}</Link></p>
        ) : (
          <ul className="index-list block-tight">
            {mine.map((v) => (
              <li key={v.pollId}>
                <Link href={`/p/${v.pollId}`} className="index-row">
                  <span className="index-title">{v.title}</span>
                  <span className="index-sum">{t.youPicked(v.pick)}</span>
                  {/* Where it stands now: a reason to come back (same visibility rules as the duel itself). */}
                  {standingText(t, v.standing) && <span className="index-standing">{standingText(t, v.standing)}</span>}
                  {/* A small bar: how far ahead the leader is. Lime (= you) when your pick is the one in front. */}
                  {(v.standing.kind === 'leading' || v.standing.kind === 'won') && (
                    <span className={'index-meter' + (v.standing.name === v.pick ? ' is-mine' : '')} aria-hidden>
                      <span style={{ width: `${v.standing.percent}%` }} />
                    </span>
                  )}
                  <ChevronRight size={16} strokeWidth={1.75} className="index-chev" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="small muted block-tight">{t.deviceOnly}</p>
      </section>
      {mine.length > 0 && <KeepVotes voterKey={voterKey} />}
      {/* TEMPORARY: the owner's "start fresh" for testing (remove before a public launch). */}
      <ResetFresh />
      <p className="small block">
        <Link href="/privacy" className="text-link">{t.privacyLink}</Link>
      </p>
    </div>
  );
}
