import type { Metadata } from 'next';
import Link from 'next/link';
import { getT } from '@/lib/lang-server';
import { grievanceContact } from '@/lib/grievance';

export const metadata: Metadata = { title: 'Privacy and reports' };

// What we keep, for how long, who sees it, and how to complain (privacy law and the IT Rules ask for all four).
// The complaints contact comes from NEXT_PUBLIC_GRIEVANCE_NAME / _EMAIL when the owner sets them.
export default async function Privacy() {
  const t = await getT();
  const { name, email } = grievanceContact();
  const parts: [string, string][] = [
    [t.privacyStoreH, t.privacyStore],
    [t.privacyKeepH, t.privacyKeep],
    [t.privacyShareH, t.privacyShare],
    [t.privacyReportH, `${t.privacyReport} ${email ? t.grievance(name, email) : t.grievanceNone}`],
  ];
  return (
    <div className="page">
      <header className="page-head page-head-tight">
        <h1 className="display">{t.privacyTitle}</h1>
        <p className="lead">{t.privacyLead}</p>
      </header>
      <section className="block prose-block">
        {parts.map(([h, p]) => (
          <div key={h}>
            <h2>{h}</h2>
            <p>{p}</p>
          </div>
        ))}
        <p className="block-tight row wrap">
          <Link href="/me" className="text-link">{t.myVotes}</Link>
          <Link href="/terms" className="text-link">{t.termsLink}</Link>
        </p>
      </section>
    </div>
  );
}
