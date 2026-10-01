'use client';
import { Check, Link2, MessageCircle, Share2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PollView } from '@/lib/polls';
import { confetti, useCountUp } from '@/lib/motion';

const SIDE_COLORS = ['#6d5ef0', '#0fa38f'];

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

function Pct({ value }: { value: number }) {
  const v = useCountUp(value);
  return <>{Math.round(v)}<span className="duel-pct-sign">%</span></>;
}

function Num({ value }: { value: number }) {
  return <>{Math.round(useCountUp(value, 700)).toLocaleString()}</>;
}

export default function Duel({ initial, headingLevel = 'h1' }: { initial: PollView; headingLevel?: 'h1' | 'h2' }) {
  const [poll, setPoll] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [a, b] = poll.options;
  const voted = poll.myVote !== null;
  const canVote = !poll.closed && (!voted || poll.allowChange);
  const Heading = headingLevel;

  // Live updates: refresh the numbers every few seconds while the tab is open.
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/polls/${poll.id}`, { cache: 'no-store' }).catch(() => null);
    if (res?.ok) setPoll(await res.json());
  }, [poll.id]);
  useEffect(() => {
    const timer = setInterval(() => document.visibilityState === 'visible' && refresh(), 6000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function vote(optionId: string, index: number) {
    if (!canVote || busy || optionId === poll.myVote) return;
    setBusy(optionId);
    setMsg('');
    navigator.vibrate?.(12);
    const res = await fetch(`/api/polls/${poll.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) {
      setPoll(data.poll);
      if (!voted) {
        setJustVoted(true);
        const r = cardRefs.current[optionId]?.getBoundingClientRect();
        if (r) confetti(r.left + r.width / 2, r.top + r.height / 2, [SIDE_COLORS[index] ?? '#6d5ef0', '#c2ef72', '#ffffff', '#f5b942']);
      }
    } else {
      setMsg(data?.error ?? 'Could not save your vote. Please try again.');
      if (res?.status === 409) refresh();
    }
    setBusy(null);
  }

  async function pickReason(reason: string) {
    const res = await fetch(`/api/polls/${poll.id}/reason`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) setPoll(data.poll);
    else setMsg(data?.error ?? 'Could not save that.');
  }

  const myOption = poll.options.find((o) => o.id === poll.myVote);
  const shareText = myOption ? `I picked ${myOption.label}. Who would you pick?` : poll.title;

  async function share() {
    const url = window.location.origin + `/p/${poll.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: poll.title, text: shareText, url }); return; } catch { /* closed */ }
    }
    copy();
  }
  async function copy() {
    const url = window.location.origin + `/p/${poll.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url);
    }
  }
  const whatsapp = () =>
    `https://wa.me/?text=${encodeURIComponent(`${shareText} ${typeof window !== 'undefined' ? window.location.origin : ''}/p/${poll.id}`)}`;

  const lead = poll.resultsVisible && poll.totalVotes > 0 ? (a.votes === b.votes ? -1 : a.votes > b.votes ? 0 : 1) : -1;
  const showReasonStep = voted && poll.reasons.length > 0 && !poll.myReason;

  return (
    <section className={'duel' + (poll.resultsVisible ? ' is-revealed' : '')} aria-labelledby={`duel-title-${poll.id}`}>
      <header className="duel-head">
        <div className="duel-meta">
          <span className={'live-dot' + (poll.closed ? ' is-closed' : '')} aria-hidden />
          <span className="label">{poll.closed ? 'Poll ended' : 'Live poll'}</span>
          {poll.resultsVisible && <span className="small">· <Num value={poll.totalVotes} /> {poll.totalVotes === 1 ? 'vote' : 'votes'}</span>}
        </div>
        <Heading id={`duel-title-${poll.id}`} className="duel-title">{poll.title}</Heading>
        {poll.description && <p className="duel-sub">{poll.description}</p>}
      </header>

      <div className="duel-arena" role="group" aria-label="Choose one">
        {poll.options.slice(0, 2).map((o, i) => {
          const picked = poll.myVote === o.id;
          const dim = voted && !picked;
          return (
            <button
              key={o.id}
              ref={(el) => { cardRefs.current[o.id] = el; }}
              className={'duel-card' + (picked ? ' is-picked' : '') + (dim ? ' is-dim' : '') + (lead === i ? ' is-leading' : '')}
              style={{ '--side': SIDE_COLORS[i] } as React.CSSProperties}
              disabled={!canVote || busy !== null}
              aria-pressed={picked}
              onClick={() => vote(o.id, i)}
            >
              {poll.resultsVisible && <span className="duel-fill" style={{ height: `${o.percent}%`, '--p': o.percent } as React.CSSProperties} aria-hidden />}
              <span className="duel-avatar" aria-hidden>{initials(o.label)}</span>
              <span className="duel-who">
                <span className="duel-name">{o.label}</span>
                {picked && <span className="duel-tag"><Check size={12} strokeWidth={3} /> Your pick</span>}
              </span>
              {poll.resultsVisible ? (
                <span className="duel-result">
                  <span className="duel-pct"><Pct value={o.percent} /></span>
                  <span className="duel-votes"><Num value={o.votes} /> {o.votes === 1 ? 'vote' : 'votes'}</span>
                </span>
              ) : (
                <span className="duel-cta">{busy === o.id ? 'Saving…' : canVote ? 'Tap to vote' : ''}</span>
              )}
            </button>
          );
        })}
        <span className="duel-vs" aria-hidden>VS</span>
      </div>

      {poll.resultsVisible && (
        <div className="tug" aria-label={`${a.label} ${Math.round(a.percent)} percent, ${b.label} ${Math.round(b.percent)} percent`}>
          <div className="tug-bar">
            <span className="tug-a" style={{ width: `${poll.totalVotes ? a.percent : 50}%`, background: SIDE_COLORS[0] }} />
            <span className="tug-b" style={{ width: `${poll.totalVotes ? b.percent : 50}%`, background: SIDE_COLORS[1] }} />
          </div>
        </div>
      )}

      {msg && <p className="error" role="alert">{msg}</p>}

      {!voted && !poll.closed && (
        <p className="duel-hint">{poll.hideUntilVoted ? 'Results are hidden until you vote. No peeking!' : 'Tap a card to vote.'}</p>
      )}

      {showReasonStep && (
        <div className="reasons">
          <h3>{justVoted ? 'Vote counted! ' : ''}What made you pick {myOption?.label}?</h3>
          <p className="small">One tap, optional.</p>
          <div className="chips">
            {poll.reasons.map((r) => <button key={r} className="chip-btn" onClick={() => pickReason(r)}>{r}</button>)}
          </div>
        </div>
      )}

      {voted && poll.resultsVisible && poll.reasons.length > 0 && poll.options.slice(0, 2).some((o) => o.reasons.length > 0) && (
        <div className="why">
          <h3>Why people pick them</h3>
          <div className="why-grid">
            {poll.options.slice(0, 2).map((o, i) => {
              const total = o.reasons.reduce((s, r) => s + r.n, 0);
              return (
                <div key={o.id}>
                  <p className="why-name" style={{ color: SIDE_COLORS[i] }}>{o.label}</p>
                  {o.reasons.length === 0 && <p className="small">No answers yet</p>}
                  {o.reasons.slice(0, 4).map((r) => (
                    <div className="why-row" key={r.reason}>
                      <span>{r.reason}</span>
                      <span className="why-bar"><i style={{ width: `${(r.n / total) * 100}%`, background: SIDE_COLORS[i] }} /></span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {voted && (
        <div className="share-panel">
          <p className="share-title">Now challenge your friends. Who would they pick?</p>
          <div className="share">
            <a className="btn btn-primary btn-lg" href={whatsapp()} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} />Share on WhatsApp</a>
            <button className="btn btn-ghost btn-lg" onClick={share}><Share2 size={16} />Share</button>
            <button className="btn btn-ghost btn-lg" onClick={copy}><Link2 size={16} />{copied ? 'Copied!' : 'Copy link'}</button>
          </div>
        </div>
      )}

      <p className="small fineprint">Just for fun. Not an official or scientific result.</p>
    </section>
  );
}
