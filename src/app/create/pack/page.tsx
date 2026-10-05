import type { Metadata } from 'next';
import PackForm from '@/components/PackForm';
import { getT } from '@/lib/lang-server';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { CreateSignIn } from '@/components/Profile';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).packTitle };
}

export default async function PackPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const t = await getT();
  const user = await currentUser(await getDb());
  if (!user) {
    return (
      <div className="page">
        <h1 className="sr-only">{t.packTitle}</h1>
        <section className="block block-tight create-signin">
          <CreateSignIn />
        </section>
      </div>
    );
  }
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">🏏 📺 {t.packTitle}</p>
        <h1 className="display">{t.packTitle}</h1>
        <p className="lead">{t.packLead}</p>
      </header>
      <section className="block block-tight">
        <PackForm initialKind={kind === 'show' ? 'show' : 'match'} signedIn={!!user} />
      </section>
    </div>
  );
}
