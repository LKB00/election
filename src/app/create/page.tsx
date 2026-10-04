import type { Metadata } from 'next';
import Link from 'next/link';
import CreateForm from '@/components/CreateForm';
import { getT } from '@/lib/lang-server';

export const metadata: Metadata = { title: 'Start a poll' };

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
      <p className="small block">
        <Link href="/privacy" className="text-link">{t.privacyLink}</Link>
      </p>
    </div>
  );
}
