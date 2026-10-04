import type { Metadata } from 'next';
import PackForm from '@/components/PackForm';
import { getT } from '@/lib/lang-server';

export const metadata: Metadata = { title: 'Make a pack' };

export default async function PackPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const t = await getT();
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">🏏 📺 {t.packTitle}</p>
        <h1 className="display">{t.packTitle}</h1>
        <p className="lead">{t.packLead}</p>
      </header>
      <section className="block block-tight">
        <PackForm initialKind={kind === 'show' ? 'show' : 'match'} />
      </section>
    </div>
  );
}
