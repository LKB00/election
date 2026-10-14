import type { Metadata } from 'next';
import { Hash } from 'lucide-react';
import { getT, langAlternates } from '@/lib/lang-server';
import { JOIN_CODE_DIGITS } from '@/lib/limits';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.joinTitle, alternates: await langAlternates('/join') };
}

// Join with a code (docs/DESIGN.md, "Join with a code"): a class, an office or an event types the number on the big
// screen or poster and lands on the poll (counted as "Join code" on the maker's page). One box, one button.
export default async function Join({ searchParams }: { searchParams: Promise<{ code?: string | string[]; bad?: string }> }) {
  const sp = await searchParams;
  const raw = sp.code;
  const code = (Array.isArray(raw) ? raw[0] : raw ?? '').trim();
  const t = await getT();
  return (
    <div className="page join-page">
      <header className="page-head">
        <h1 className="display">{t.joinTitle}</h1>
        <p className="lead">{t.joinLead}</p>
      </header>
      <form action="/join/go" className="join-form">
        <label className="search join-box">
          <Hash size={18} strokeWidth={1.75} aria-hidden />
          <span className="sr-only">{t.joinPh}</span>
          <input name="code" defaultValue={code} inputMode="numeric" autoComplete="off" pattern={`[0-9 ]{${JOIN_CODE_DIGITS},${JOIN_CODE_DIGITS + 2}}`} maxLength={JOIN_CODE_DIGITS + 2} placeholder={t.joinPh} autoFocus required />
        </label>
        <button className="btn btn-primary btn-lg">{t.joinGo}</button>
        {sp.bad && <p className="duel-error" role="alert">{t.joinBad}</p>}
      </form>
    </div>
  );
}
