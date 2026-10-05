import type { Metadata } from 'next';
import Link from 'next/link';
import { getLang, getT } from '@/lib/lang-server';
import { grievanceContact, RULES_UPDATED } from '@/lib/grievance';
import { INDIA_OFFSET, INDIA_TZ, dateLocale } from '@/lib/time';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).termsTitle };
}

// The rules and the banned-content list, in the reader's language (the IT Rules ask for both), plus the complaints officer.
// When this text changes, change RULES_UPDATED too.
export default async function Terms() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const { name, email } = grievanceContact();
  const updated = new Date(`${RULES_UPDATED}T12:00:00${INDIA_OFFSET}`).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long', year: 'numeric', timeZone: INDIA_TZ });
  return (
    <div className="page">
      <header className="page-head page-head-tight">
        <h1 className="display">{t.termsTitle}</h1>
        <p className="lead">{t.termsLead}</p>
        <p className="small muted">{t.termsUpdated(updated)}</p>
      </header>
      <section className="block prose-block">
        {t.terms.map((part) => (
          <div key={part.h}>
            <h2>{part.h}</h2>
            <ul className="terms-list">
              {part.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h2>{t.termsComplaints}</h2>
          <p>{email ? t.grievance(name, email) : t.grievanceNone}</p>
        </div>
        <p className="block-tight">
          <Link href="/privacy" className="text-link">{t.privacyLink}</Link>
        </p>
      </section>
    </div>
  );
}
