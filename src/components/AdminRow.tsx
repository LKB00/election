'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { ReviewItem } from '@/lib/polls';
import { useT } from '@/lib/lang';

// One duel on the review page: what it is, why it is here, and the owner's three choices.
export default function AdminRow({ item, adminKey }: { item: ReviewItem; adminKey: string }) {
  const t = useT();
  const [state, setState] = useState({ hidden: item.hidden, reviewed: item.reviewed, paused: item.paused });
  const [busy, setBusy] = useState(false);
  // Acted on: the row steps back (dimmed, "Done"), so the next one to look at stands out.
  const [done, setDone] = useState(false);
  // The 2-hour clock for photo reports (IT Rules): show how long ago the first report came.
  const [now] = useState(() => Date.now());
  const [failed, setFailed] = useState('');
  const mins = item.firstReportAt ? Math.max(0, Math.round((now - new Date(item.firstReportAt).getTime()) / 60_000)) : null;
  const photoReport = item.reasons.some((r) => r === 'private' || r === 'me');
  async function act(action: 'hide' | 'show' | 'approve' | 'resume') {
    setBusy(true);
    const res = await fetch(`/api/admin/${item.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: adminKey, action }),
    }).catch(() => null);
    if (res?.ok) {
      setState(
        action === 'hide' ? { ...state, hidden: true }
        : action === 'show' ? { ...state, hidden: false }
        : action === 'resume' ? { ...state, paused: false }
        : { hidden: false, reviewed: true, paused: false },
      );
      setDone(true);
      setFailed('');
    } else setFailed(res ? t.errGeneric : t.noNetTry); // the photo-report clock is running: a failure must show
    setBusy(false);
  }
  return (
    <div className={'review-row' + (done ? ' is-done' : '')}>
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
        {mins !== null && <> · {t.adminReportedAgo(mins)}</>}
        {state.hidden && <> · {t.adminHidden}</>}
        {!state.reviewed && <> · {t.adminUnreviewed}</>}
      </p>
      {state.paused && <p className="small txt-bad">{t.adminPaused}</p>}
      {photoReport && !state.hidden && !done && <p className="small txt-bad"><strong>{t.adminUrgent}</strong></p>}
      <span className="row wrap">
        {done && <span className="small muted">{t.adminDone} ✓</span>}
        {state.paused && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act('resume')}>{t.adminResume}</button>}
        {state.hidden ? (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act('show')}>{t.adminShow}</button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act('hide')}>{t.adminHide}</button>
        )}
        {!state.reviewed && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act('approve')}>{t.adminApprove}</button>}
      </span>
      {failed && <p className="small duel-error" role="alert">{failed}</p>}
    </div>
  );
}
