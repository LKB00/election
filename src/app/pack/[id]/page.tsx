import type { Metadata } from 'next';
import { Clock } from 'lucide-react';
import { notFound } from 'next/navigation';
import CreatedPanel from '@/components/CreatedPanel';
import DuelGame from '@/components/DuelGame';
import PackShare from '@/components/PackShare';
import { getDb } from '@/db';
import { getPack } from '@/lib/packs';
import { readVoterId } from '@/lib/voter';
import { getLang, getT } from '@/lib/lang-server';
import { INDIA_TZ, dateLocale } from '@/lib/time';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pack = await getPack(await getDb(), (await params).id, null);
  const t = await getT();
  if (!pack) return { title: t.packNotFound };
  return {
    title: pack.title,
    robots: { index: false, follow: true },
    openGraph: { title: t.metaPackOg(pack.title), description: pack.views.map((v) => v.title).join(' · ') },
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
  const when = new Date(pack.startsAt).toLocaleString(dateLocale(lang), { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: INDIA_TZ });
  return (
    <div className="page page-wide">
      <header className="page-head page-head-tight">
        <p className="eyebrow">{pack.kind === 'match' ? '🏏' : '📺'} {pack.kind === 'match' ? t.packMatch : t.packShow}</p>
        <h1 className="display">{pack.title}</h1>
        <p className="small muted pack-head__when">
          <Clock size={14} strokeWidth={1.75} aria-hidden /> {started ? t.packStarted : t.packCloses(when)}
        </p>
        {pack.kind === 'show' && <p className="small muted">{t.packFanNote}</p>}
      </header>
      {isNew === '1' ? (
        <CreatedPanel id={pack.id} title={pack.title} path={`/pack/${pack.id}`} heading={t.packCreated} text={t.packShare(pack.title)} button={t.packShareBtn} />
      ) : (
        <PackShare id={pack.id} title={pack.title} />
      )}
      <section className="home-game duel-first" aria-label={pack.title}>
        <DuelGame deck={pack.views} start={0} />
      </section>
    </div>
  );
}
