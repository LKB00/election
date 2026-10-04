import type { Metadata } from 'next';
import Link from 'next/link';
import { Timer } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import CreateForm from '@/components/CreateForm';
import { getT } from '@/lib/lang-server';

export const metadata: Metadata = { title: 'Start a poll' };

// "Ask it yourself" from an empty search lands here with ?title=…, already typed in.
export default async function CreatePage({ searchParams }: { searchParams: Promise<{ title?: string | string[]; topic?: string | string[] }> }) {
  const sp = await searchParams;
  const raw = sp.title;
  // An empty topic page's "Start a poll" lands here with ?topic=food, so the poll starts in that topic.
  const topicRaw = Array.isArray(sp.topic) ? sp.topic[0] : sp.topic;
  const topic = (CATEGORIES as readonly string[]).includes(topicRaw ?? '') ? topicRaw : undefined;
  const title = (Array.isArray(raw) ? raw[0] : raw ?? '').trim().slice(0, 120);
  const t = await getT();
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow"><Timer size={13} strokeWidth={2} aria-hidden />{t.takes30}</p>
        <h1 className="display">{t.startDuel}</h1>
        <p className="lead">{t.createLead}</p>
        {/* A pack: a few polls around a match or a show night, made in one go. */}
        <p className="small"><Link href="/create/pack" className="text-link">🏏 📺 {t.packMakeLink}</Link></p>
      </header>
      <section className="block block-tight">
        <CreateForm initialTitle={title} initialTopic={topic} />
      </section>
      <p className="small block row wrap">
        <Link href="/terms" className="text-link">{t.termsLink}</Link>
        <Link href="/privacy" className="text-link">{t.privacyLink}</Link>
      </p>
    </div>
  );
}
