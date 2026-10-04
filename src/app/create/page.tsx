import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Timer } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import CreateForm from '@/components/CreateForm';
import { getT } from '@/lib/lang-server';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';

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
  const user = await currentUser(await getDb());
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow"><Timer size={13} strokeWidth={2} aria-hidden />{t.takes30}</p>
        <h1 className="display">{t.startDuel}</h1>
        <p className="lead">{t.createLead}</p>
      </header>
      <section className="block block-tight">
        <CreateForm initialTitle={title} initialTopic={topic} signedIn={!!user} />
      </section>
      {/* P3, after the form: a pack (a few polls around a match or a show night, made in one go). */}
      <section className="al-block">
        <h2 className="al-block__title">{t.packOr}</h2>
        <ul className="al-listcard">
          <li>
            <Link href="/create/pack" className="al-row">
              <span className="al-row__disc is-faces" style={{ '--tone': 'var(--p-control)' } as React.CSSProperties} aria-hidden>🏏</span>
              <span className="al-row__main">
                <span className="al-row__title">{t.packRow}</span>
                <span className="al-row__meta">{t.packRowNote}</span>
              </span>
              <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
            </Link>
          </li>
        </ul>
      </section>
      <p className="small block row wrap">
        <Link href="/terms" className="text-link">{t.termsLink}</Link>
        <Link href="/privacy" className="text-link">{t.privacyLink}</Link>
      </p>
    </div>
  );
}
