import type { Metadata } from 'next';
import RoomForm from '@/components/RoomForm';
import { getT } from '@/lib/lang-server';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { CreateSignIn } from '@/components/Profile';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).roomTitle };
}

// Poll night (docs/DESIGN.md, "Poll night"): a few questions for one room (a party, a class, an office), on a big screen.
export default async function RoomPage() {
  const t = await getT();
  const user = await currentUser(await getDb());
  if (!user) {
    return (
      <div className="page">
        <h1 className="sr-only">{t.roomTitle}</h1>
        <section className="block block-tight create-signin">
          <CreateSignIn />
        </section>
      </div>
    );
  }
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">🎉 {t.roomTitle}</p>
        <h1 className="display">{t.roomTitle}</h1>
        <p className="lead">{t.roomLead}</p>
      </header>
      <section className="block block-tight">
        <RoomForm signedIn={!!user} />
      </section>
    </div>
  );
}
