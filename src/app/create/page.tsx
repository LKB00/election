import type { Metadata } from 'next';
import CreateForm from '@/components/CreateForm';
import { getT } from '@/lib/lang-server';

export const metadata: Metadata = { title: 'Start a duel' };

export default async function CreatePage() {
  const t = await getT();
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">{t.takes30}</p>
        <h1 className="display">{t.startDuel}</h1>
        <p className="lead">{t.createLead}</p>
      </header>
      <section className="block block-tight">
        <CreateForm />
      </section>
    </div>
  );
}
