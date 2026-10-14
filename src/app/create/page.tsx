import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import { getCircle } from '@/lib/circles';
import CreateForm, { type AskAgain } from '@/components/CreateForm';
import { ownPoll } from '@/lib/maker';
import { getPoll } from '@/lib/polls';
import { isCode } from '@/lib/validation';
import { getT } from '@/lib/lang-server';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { CreateSignIn } from '@/components/Profile';
import Step from '@/components/Step';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).create };
}

// "Ask it yourself" from an empty search lands here with ?title=…, already typed in.
export default async function CreatePage({ searchParams }: { searchParams: Promise<{ title?: string | string[]; topic?: string | string[]; again?: string; back?: string; circle?: string }> }) {
  const sp = await searchParams;
  const raw = sp.title;
  // An empty topic page's "Start a poll" lands here with ?topic=food, so the poll starts in that topic.
  const topicRaw = Array.isArray(sp.topic) ? sp.topic[0] : sp.topic;
  const topic = (CATEGORIES as readonly string[]).includes(topicRaw ?? '') ? topicRaw : undefined;
  const title = (Array.isArray(raw) ? raw[0] : raw ?? '').trim().slice(0, 120);
  const t = await getT();
  const db = await getDb();
  const user = await currentUser(db);
  // "Ask the circle" from a circle's page: only for its members.
  const c = user && isCode(sp.circle) ? await getCircle(db, sp.circle, user.id) : null;
  const circle = c?.member ? { id: c.id, name: c.name, emoji: c.emoji } : undefined;
  // "Ask again" from the maker's page: the earlier poll (only your own) filled in.
  let again: AskAgain | undefined;
  if (user && isCode(sp.again) && (await ownPoll(db, sp.again, user.id))) {
    const p = await getPoll(db, sp.again, null, null, { noPrevious: true });
    if (p) again = { id: p.id, title: p.title, options: p.options.map((o) => o.label), emojis: p.options.map((o) => o.emoji ?? ''), kind: p.kind, calledIt: p.calledIt, category: p.category, showMaker: !!p.maker };
  }
  // Signed out: the profile screen first; the form opens once there is a profile (the server refuses polls without one).
  if (!user) {
    return (
      <div className="page">
        <Step e="create_open" />
        <h1 className="sr-only">{t.startDuel}</h1>
        <section className="block block-tight create-signin">
          <CreateSignIn />
        </section>
      </div>
    );
  }
  // On a computer the page widens so the live preview can sit beside the form (election.css, "Desktop").
  return (
    <div className="page create-page">
      <Step e="create_open" />
      <header className="page-head">
        <h1 className="display">{t.startDuel}</h1>
      </header>
      <section className="block block-tight">
        <CreateForm initialTitle={title} initialTopic={topic} signedIn={!!user} again={again} askBack={sp.back === '1'} circle={circle} />
      </section>
      <p className="small block row wrap">
        <Link href="/terms" className="text-link">{t.termsLink}</Link>
        <Link href="/privacy" className="text-link">{t.privacyLink}</Link>
      </p>
    </div>
  );
}
