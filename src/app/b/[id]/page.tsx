import { currentUser } from '@/lib/auth';
import { MarkOwn } from '@/lib/ownNav';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { Check, ChevronRight, Swords, Trophy } from 'lucide-react';
import BattleShare from '@/components/BattleShare';
import Verified from '@/components/Verified';
import { getDb, schema } from '@/db';
import { getBattle, type Match } from '@/lib/battles';
import { getLang, getT } from '@/lib/lang-server';
import { INDIA_TZ, dateLocale, monthStyle } from '@/lib/time';
import { readVoterId } from '@/lib/voter';
import type { Dict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await getBattle(await getDb(), (await params).id, null);
  const t = await getT();
  return b ? { title: b.title, description: t.battleShareText(b.title) } : { title: t.battleNotFound, robots: { index: false } };
}

// "Final", "Semi-finals", "Quarter-finals", counted back from the last round.
const roundName = (t: Dict, r: number, total: number) => (r === total ? t.battleFinal : r === total - 1 ? t.battleSemi : r === total - 2 ? t.battleQuarter : t.battleRoundN(r));

// A knockout battle's bracket (docs/DESIGN.md, "Knockout battles"). P1: the matches open now, one tap to vote each.
// P2: the rounds before (who went through) and after (waiting for winners). The champion on top once there is one.
// No numbers on open matches (results after you vote, as on every poll).
export default async function BattlePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const db = await getDb();
  const [t, lang, voterId, user] = await Promise.all([getT(), getLang(), readVoterId(), currentUser(db)]);
  const b = await getBattle(db, id, voterId);
  if (!b) notFound();
  // Your own battle sits under You (docs/DESIGN.md, "Your poll's place").
  const mine = !!user && b.ownerId === user.id;
  const maker = b.showMaker && b.ownerId ? (await db.select({ id: schema.users.id, name: schema.users.name, avatar: schema.users.avatar, verified: schema.users.verified }).from(schema.users).where(eq(schema.users.id, b.ownerId)).limit(1))[0] : null;
  const total = Math.log2(b.size);
  const when = b.endsAt ? new Date(b.endsAt).toLocaleString(dateLocale(lang), { weekday: 'short', day: 'numeric', month: monthStyle(lang), hour: 'numeric', minute: '2-digit', timeZone: INDIA_TZ }) : '';
  const side = (m: Match, k: 'a' | 'b') => (
    <span className={'battle-side' + (m.winner === k ? ' is-won' : m.winner ? ' is-out' : '')}>
      <span className="battle-name">{m[k].emoji ? `${m[k].emoji} ` : ''}{m[k].label}</span>
      {m.winner === k && <span className="al-chip is-good"><Check size={12} strokeWidth={2.5} aria-hidden /> {t.battleWon}</span>}
    </span>
  );
  return (
    <div className="page battle-page">
      {mine && <MarkOwn path={`/b/${b.id}`} back="/you" kind="set" />}
      <header className="page-head page-head-tight">
        <p className="eyebrow"><Swords size={13} strokeWidth={2} aria-hidden /> {t.battleRow}</p>
        <h1 className="display">{b.title}</h1>
        {maker && <Link href={`/u/${maker.id}`} className="maker-by"><span className="maker-by-face" aria-hidden>{maker.avatar}</span> {t.askedBy(maker.name)}{maker.verified && <Verified label={t.verifiedLabel} />}</Link>}
        {isNew === '1' && <p className="small duel-friend" role="status">{t.battleCreated}</p>}
      </header>

      {b.champion && (
        <section className="battle-champion" aria-live="polite">
          <Trophy size={28} strokeWidth={1.75} aria-hidden />
          <p className="display">{t.battleChampion(b.champion)}</p>
        </section>
      )}

      {Array.from({ length: total }, (_, k) => k + 1).map((r) => {
        const matches = b.rounds[r - 1] ?? [];
        const slots = b.size / 2 ** r;
        const live = matches.some((m) => m.open);
        return (
          <section key={r} className={'al-block battle-round' + (live ? ' is-live' : '')}>
            <h2 className="al-block__title">{roundName(t, r, total)}</h2>
            {live && when && <p className="small muted battle-ends">{t.battleEnds(when)}</p>}
            <ul className="al-listcard">
              {matches.length
                ? matches.map((m) => (
                    <li key={m.pollId}>
                      <Link href={`/p/${m.pollId}`} className="al-row battle-match">
                        <span className="al-row__main battle-pair">{side(m, 'a')}<span className="battle-vs" aria-hidden>vs</span>{side(m, 'b')}</span>
                        {m.open && <span className={m.myVote ? 'al-chip' : 'evm-btn'}>{m.myVote ? t.voted : t.vote}</span>}
                        <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
                      </Link>
                    </li>
                  ))
                : Array.from({ length: slots }, (_, s) => (
                    <li key={s} className="al-row battle-match is-later"><span className="al-row__main"><span className="al-row__meta">{t.battleLater}</span></span></li>
                  ))}
            </ul>
          </section>
        );
      })}

      {!b.champion && <p className="small muted">{t.battleNext}</p>}
      <div className="battle-share"><BattleShare id={b.id} title={b.title} primary={isNew === '1'} /></div>
    </div>
  );
}
