import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AdminRow from '@/components/AdminRow';
import { getDb } from '@/db';
import { isAdminKey } from '@/lib/admin';
import { getReviewQueue } from '@/lib/polls';
import { getT } from '@/lib/lang-server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Review', robots: { index: false, follow: false } };

// The owner's review page: /admin?key=<ADMIN_SECRET>. Anyone else gets "not found".
// Reported duels first, then new duels nobody has checked. Hide takes one down at once.
export default async function Admin({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  if (!isAdminKey(key)) notFound();
  const t = await getT();
  const items = await getReviewQueue(await getDb());
  return (
    <div className="page">
      <header className="page-head page-head-tight">
        <h1 className="display">{t.adminTitle}</h1>
        <p className="lead">{t.adminLead}</p>
      </header>
      <section className="block">
        {items.length === 0 ? <p className="muted">{t.adminEmpty}</p> : items.map((item) => <AdminRow key={item.id} item={item} adminKey={key!} />)}
      </section>
    </div>
  );
}
