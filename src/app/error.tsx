'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import Spot from '@/components/Spot';
import { useT } from '@/lib/lang';

// When a page fails (the database is slow or down): a calm screen in the visitor's language, with Try again and a way
// home, instead of the framework's bare "Application error" (owner's audit, Oct 2026).
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => console.error(error), [error]);
  return (
    <div className="page empty-page">
      <div className="spot-empty">
        <Spot kind="invite" />
        <h1 className="spot-empty__title">{t.pageErrorTitle}</h1>
        <p className="spot-empty__line">{t.errGeneric}</p>
        <button type="button" className="btn btn-primary btn-lg spot-empty__go" onClick={reset}>{t.tryAgain}</button>
        <Link href="/" className="text-link small spot-empty__more">{t.home}</Link>
      </div>
    </div>
  );
}
