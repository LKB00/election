'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { ReviewItem } from '@/lib/polls';
import { useT } from '@/lib/lang';

// One duel on the review page: what it is, why it is here, and the owner's three choices.
export default function AdminRow({ item, adminKey }: { item: ReviewItem; adminKey: string }) {
  const t = useT();
  const [state, setState] = useState({ hidden: item.hidden, reviewed: item.reviewed });
  const [busy, setBusy] = useState(false);
  async function act(action: 'hide' | 'show' | 'approve') {
    setBusy(true);
    const res = await fetch(`/api/admin/${item.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: adminKey, action }),
    }).catch(() => null);
    if (res?.ok) setState(action === 'hide' ? { ...state, hidden: true } : action === 'show' ? { ...state, hidden: false } : { hidden: false, reviewed: true });
    setBusy(false);
  }
  return (
    <div className="review-row">
      <Link href={`/p/${item.id}`} className="text-link"><strong>{item.title}</strong></Link>
      <p className="small">{item.options.join(' · ')}</p>
      {item.photos.length > 0 && (
        <span className="row wrap review-photos">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {item.photos.map((src) => <img key={src} src={src} alt="" width={56} height={70} />)}
        </span>
      )}
      <p className="small muted">
        {t.categories[item.category] ?? item.category}
        {item.reports > 0 && <> · <span className="txt-bad">{t.adminReports(item.reports)}</span>: {item.reasons.map((r) => t.reportReasons[r] ?? r).join(', ')}</>}
        {state.hidden && <> · {t.adminHidden}</>}
        {!state.reviewed && <> · {t.adminUnreviewed}</>}
      </p>
      <span className="row wrap">
        {state.hidden ? (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act('show')}>{t.adminShow}</button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act('hide')}>{t.adminHide}</button>
        )}
        {!state.reviewed && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act('approve')}>{t.adminApprove}</button>}
      </span>
    </div>
  );
}
