import { getT } from '@/lib/lang-server';
import EmptyState from '@/components/EmptyState';

// Same empty-page shape as every other: picture, title, one line, one step.
export default async function NotFound() {
  const t = await getT();
  return (
    <div className="page empty-page">
      <h1 className="sr-only">{t.notFound}</h1>
      <EmptyState kind="lost" title={t.notFound} line={t.notFoundLead} action={{ href: '/', label: t.goToday }} secondary={{ href: '/polls', label: t.browsePolls }} />
    </div>
  );
}
