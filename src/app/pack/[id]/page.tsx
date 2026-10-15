import type { Metadata } from 'next';
import { Clock, Tv } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CreatedPanel from '@/components/CreatedPanel';
import DuelGame from '@/components/DuelGame';
import PackShare from '@/components/PackShare';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { currentUser } from '@/lib/auth';
import { MarkOwn } from '@/lib/ownNav';
import { getPack } from '@/lib/packs';
import { readVoterId } from '@/lib/voter';
import { getLang, getT } from '@/lib/lang-server';
import { ogBase, siteImage } from '@/lib/og';
import { INDIA_TZ, dateLocale } from '@/lib/time';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pack = await getPack(await getDb(), (await params).id, null);
  const [t, lang] = await Promise.all([getT(), getLang()]);
  if (!pack) return { title: t.packNotFound };
  return {
    title: pack.title,
    robots: { index: false, follow: true },
    openGraph: { ...ogBase(lang), title: t.metaPackOg(pack.title), description: pack.views.map((v) => v.title).join(' · '), images: [siteImage(lang)] },
    twitter: { card: 'summary_large_image', images: [siteImage(lang).url] },
  };
}

// A match-day or show-night pack: what it is and when predictions close (P2), then its polls, played one after another (P1).
export default async function PackPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const db = await getDb();
  const t = await getT();
  const lang = await getLang();
  const pack = await getPack(db, id, await readVoterId());
  if (!pack) notFound();
  const started = new Date(pack.startsAt).getTime() <= Date.now();
  const room = pack.kind === 'room';
  // Your own pack or poll night sits under You (docs/DESIGN.md, "Your poll's place").
  const [user, owner] = await Promise.all([
    currentUser(db),
    db.select({ ownerId: schema.polls.ownerId }).from(schema.polls).where(eq(schema.polls.packId, pack.id)).limit(1),
  ]);
  const mine = !!user && owner[0]?.ownerId === user.id;
  const when = new Date(pack.startsAt).toLocaleString(dateLocale(lang), { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: INDIA_TZ });
  // Computers (election.css, "Desktop"): the pack's polls on the left; what it is, when it closes and sharing on the right.
  return (
    <div className="page page-wide pack-page">
      {mine && <MarkOwn path={`/pack/${pack.id}`} back="/you" kind="set" />}
      <header className="page-head page-head-tight pack-head">
        <p className="eyebrow">{room ? `🎉 ${t.roomTitle}` : pack.kind === 'match' ? `🏏 ${t.packMatch}` : `📺 ${t.packShow}`}</p>
        <h1 className="display">{pack.title}</h1>
        <p className="small muted pack-head__when">
          <Clock size={14} strokeWidth={1.75} aria-hidden /> {room ? t.roomStarted : started ? t.packStarted : t.packCloses(when)}
        </p>
        {/* Poll night: the presenter's next step is the big screen (anyone with the link may open it; it is the public view). */}
        {room && (
          <Link href={`/pack/${pack.id}/tv`} className="btn btn-ghost pack-tv-link">
            <Tv size={16} strokeWidth={2} aria-hidden /> {t.roomTv}
          </Link>
        )}
        {pack.kind === 'show' && <p className="small muted">{t.packFanNote}</p>}
      </header>
      <div className="pack-share">
      {isNew === '1' ? (
        <CreatedPanel id={pack.id} title={pack.title} path={`/pack/${pack.id}`} heading={t.packCreated} text={room ? t.roomShare(pack.title) : t.packShare(pack.title)} button={t.packShareBtn} />
      ) : (
        <PackShare id={pack.id} title={pack.title} room={room} />
      )}
      </div>
      <section className="home-game duel-first pack-game" aria-label={pack.title}>
        <DuelGame deck={pack.views} start={0} />
      </section>
    </div>
  );
}
