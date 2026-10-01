'use client';
import { Check, Link2, Share2 } from 'lucide-react';
import { useState } from 'react';
import type { PollView as Poll } from '@/lib/polls';

export default function PollView({ initial }: { initial: Poll }) {
  const [poll, setPoll] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const voted = poll.myVote !== null;
  const canVote = !poll.closed && (!voted || poll.allowChange);

  async function vote(optionId: string) {
    if (!canVote || busy || optionId === poll.myVote) return;
    setBusy(true);
    setMsg('');
    const res = await fetch(`/api/polls/${poll.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) setPoll(data.poll);
    else {
      setMsg(data?.error ?? 'Could not save your vote. Try again.');
      if (res?.status === 409) {
        const fresh = await fetch(`/api/polls/${poll.id}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
        if (fresh?.id) setPoll(fresh);
      }
    }
    setBusy(false);
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: poll.title, url }); return; } catch { /* user closed the sheet */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url);
    }
  }

  const top = Math.max(...poll.options.map((o) => o.votes));

  return (
    <>
      <div className="poll-meta">
        <span className="chip">{poll.category}</span>
        <span className={'chip ' + (poll.closed ? 'chip-closed' : 'chip-live')}>{poll.closed ? 'Ended' : 'Live'}</span>
        {poll.resultsVisible && <span className="small">{poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}</span>}
      </div>
      <h1 style={{ marginTop: 12 }}>{poll.title}</h1>
      {poll.description && <p className="lead">{poll.description}</p>}

      <div className="choices" role="list">
        {poll.options.map((o) => {
          const picked = poll.myVote === o.id;
          const leading = poll.resultsVisible && poll.totalVotes > 0 && o.votes === top;
          const inner = (
            <>
              {poll.resultsVisible && <span className="choice-bar" style={{ width: `${o.percent}%` }} />}
              <span className="avatar" aria-hidden>{o.label[0]?.toUpperCase()}</span>
              <span className="choice-name">{o.label}{picked && <Check size={14} style={{ marginLeft: 6, verticalAlign: -2 }} aria-label="Your vote" />}</span>
              {poll.resultsVisible && <span className="choice-pct">{Math.round(o.percent)}%</span>}
              {poll.resultsVisible && <span className="choice-votes">{o.votes}{leading && !poll.closed ? ' ▲' : ''}</span>}
            </>
          );
          const cls = 'choice' + (picked ? ' is-picked' : '');
          return canVote ? (
            <button key={o.id} role="listitem" className={cls} disabled={busy} onClick={() => vote(o.id)}>{inner}</button>
          ) : (
            <div key={o.id} role="listitem" className={cls}>{inner}</div>
          );
        })}
      </div>

      {msg && <p className="error" role="alert" style={{ marginTop: 16 }}>{msg}</p>}
      <p className="note" aria-live="polite">
        {poll.closed ? 'This poll has ended.'
          : !voted ? (poll.hideUntilVoted ? 'Tap a choice to vote. Results show after you vote.' : 'Tap a choice to vote.')
          : poll.allowChange ? 'Vote saved. You can change it until the poll ends.'
          : 'Thanks! Your vote is saved.'}
        {poll.endsAt && !poll.closed && ` Ends ${new Date(poll.endsAt).toLocaleString()}.`}
      </p>

      <div className="share">
        <button className="btn btn-primary" onClick={share}><Share2 size={16} />Share</button>
        <button className="btn btn-ghost" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copy this link', window.location.href); } }}>
          <Link2 size={16} />{copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      <p className="small fineprint">Just for fun. Not an official or scientific result.</p>
    </>
  );
}
