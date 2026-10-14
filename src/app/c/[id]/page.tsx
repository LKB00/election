import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Plus } from 'lucide-react';
import { CircleInvite, CircleJoin, CircleManage } from '@/components/CircleActions';
import EmptyState from '@/components/EmptyState';
import MoreList from '@/components/MoreList';
import { CreateSignIn } from '@/components/Profile';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { getCircle } from '@/lib/circles';
import { getT } from '@/lib/lang-server';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string; new?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCircle(await getDb(), (await params).id, null);
  const t = await getT();
  // Never in search: a circle is a private group.
  return { title: c ? c.name : t.notFound, robots: { index: false, follow: false } };
}

// A circle (docs/DESIGN.md, "Circles"). Members: its name and faces (P2), "Ask the circle" (P1, the ink button), its
// polls (P1 list), invite people (P2), leave or delete (P3, last). Not a member: the name and one Join button (with the
// invite link), or a line saying to ask for the link. Signed out: sign in first.
export default async function CirclePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { k, new: isNew } = await searchParams;
  const db = await getDb();
  const [user, t] = await Promise.all([currentUser(db), getT()]);
  const c = await getCircle(db, id, user?.id ?? null);
  if (!c) notFound();

  const head = (
    <header className="page-head page-head-tight circle-head">
      <p className="eyebrow">{c.emoji} {t.circleEyebrow}</p>
      <h1 className="display">{c.name}</h1>
      <p className="small muted">{t.circleMembers(c.members)}</p>
    </header>
  );

  if (!user || !c.member) {
    return (
      <div className="page circle-page">
        {head}
        <section className="block block-tight">
          {!user ? (
            <>
              <p className="lead">{k ? t.circleSignToJoin : t.circleSignIn}</p>
              <CreateSignIn />
            </>
          ) : k ? (
            <>
              <p className="lead">{t.circleJoinLead}</p>
              <CircleJoin id={c.id} invite={k} />
            </>
          ) : (
            <p className="lead">{t.circleAskLink}</p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="page circle-page">
      {head}
      {isNew === '1' && <p className="small duel-friend" role="status">{t.circleMade}</p>}
      <ul className="circle-faces" aria-label={t.circleMembers(c.members)}>
        {c.faces.map((f, n) => (
          <li key={n} className="circle-face" title={f.name}>
            <span aria-hidden>{f.avatar}</span>
            <span className="small">{f.name}</span>
          </li>
        ))}
      </ul>
      <div className="row wrap circle-main">
        <Link href={`/create?circle=${c.id}`} className="btn btn-primary btn-lg">
          <Plus size={18} strokeWidth={2} aria-hidden /> {t.circleAsk}
        </Link>
        {c.invite && <CircleInvite id={c.id} name={c.name} invite={c.invite} />}
      </div>
      {c.list.length ? (
        <section className="al-block" aria-label={t.circlePolls}>
          <h2 className="al-block__title">{t.circlePolls} <span className="al-block__aside">{t.pollsN(c.list.length)}</span></h2>
          <MoreList className="al-listcard">
            {c.list.map((p) => (
              <li key={p.id}>
                <Link href={`/p/${p.id}`} className="al-row">
                  <span className="al-row__disc" style={{ '--tone': 'var(--p-input)' } as React.CSSProperties} aria-hidden>{c.emoji}</span>
                  <span className="al-row__main">
                    <span className="al-row__title">{p.title}</span>
                    <span className="al-row__meta">{p.closed ? `${t.pollClosedTag} · ${t.votes(p.votes)}` : t.votesSoFar(p.votes)}</span>
                  </span>
                  <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
                </Link>
              </li>
            ))}
          </MoreList>
        </section>
      ) : (
        <section className="block">
          <EmptyState kind="pen" title={t.circleEmptyTitle} line={t.circleEmptyLine} />
        </section>
      )}
      <p className="small muted">{t.circlePrivacy}</p>
      <CircleManage id={c.id} mine={c.mine} />
    </div>
  );
}
