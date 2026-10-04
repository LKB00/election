import type { Metadata } from 'next';
import Link from 'next/link';
import { Timer } from 'lucide-react';
import CreateForm from '@/components/CreateForm';
import { getT } from '@/lib/lang-server';

export const metadata: Metadata = { title: 'Start a poll' };

// "Ask it yourself" from an empty search lands here with ?title=…, already typed in.
export default async function CreatePage({ searchParams }: { searchParams: Promise<{ title?: string | string[] }> }) {
  const raw = (await searchParams).title;
  const title = (Array.isArray(raw) ? raw[0] : raw ?? '').trim().slice(0, 120);
  const t = await getT();
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow"><Timer size={13} strokeWidth={2} aria-hidden />{t.takes30}</p>
        <h1 className="display">{t.startDuel}</h1>
        <p className="lead">{t.createLead}</p>
      </header>
      <section className="block block-tight">
        <CreateForm initialTitle={title} />
      </section>
      <p className="small block row wrap">
        <Link href="/terms" className="text-link">{t.termsLink}</Link>
        <Link href="/privacy" className="text-link">{t.privacyLink}</Link>
      </p>
    </div>
  );
}
