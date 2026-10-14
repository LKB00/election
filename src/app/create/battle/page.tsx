import type { Metadata } from 'next';
import BattleForm from '@/components/BattleForm';
import { CreateSignIn } from '@/components/Profile';
import { getDb } from '@/db';
import { currentUser } from '@/lib/auth';
import { getT } from '@/lib/lang-server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).battleTitle };
}

// Make a knockout battle (docs/DESIGN.md, "Knockout battles"). Like every poll, it needs a profile first.
export default async function BattleCreatePage() {
  const t = await getT();
  const user = await currentUser(await getDb());
  if (!user) {
    return (
      <div className="page">
        <h1 className="sr-only">{t.battleTitle}</h1>
        <section className="block block-tight create-signin"><CreateSignIn /></section>
      </div>
    );
  }
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="display">{t.battleTitle}</h1>
        <p className="lead">{t.battleLead}</p>
      </header>
      <section className="block block-tight"><BattleForm /></section>
    </div>
  );
}
