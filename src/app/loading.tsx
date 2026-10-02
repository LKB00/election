import { getT } from '@/lib/lang-server';

// While a page loads: a grey outline of the ballot instead of a blank screen.
export default async function Loading() {
  const t = await getT();
  return (
    <div className="page page-wide" aria-busy="true" aria-label={t.loading}>
      <div className="duel-first" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span className="skeleton skeleton-line" style={{ width: '60%', height: 32 }} />
        <span className="skeleton skeleton-line" style={{ width: '40%' }} />
        <div className="skeleton-cards">
          <span className="skeleton skeleton-card" />
          <span className="skeleton skeleton-card" />
        </div>
      </div>
    </div>
  );
}
