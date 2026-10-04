import Link from 'next/link';
import { getT } from '@/lib/lang-server';
import Spot from '@/components/Spot';

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="page">
      <header className="page-head">
        <Spot kind="lost" />
        <h1 className="display">{t.notFound}</h1>
        <p className="lead">{t.notFoundLead}</p>
      </header>
      <Link href="/" className="btn btn-primary btn-lg block-tight">{t.goToday}</Link>
    </div>
  );
}
