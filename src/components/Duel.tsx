'use client';
import { Check, Link2, MessageCircle, Share2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PollView } from '@/lib/polls';
import { confetti, useCountUp } from '@/lib/motion';

const SIDE = ['var(--side-a)', 'var(--side-b)'];
const SIDE_HEX = ['#7c6cff', '#14c8ac'];

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

function Pct({ value }: { value: number }) {
  return <>{Math.round(useCountUp(value, 1100))}</>;
}
function Num({ value }: { value: number }) {
  return <>{Math.round(useCountUp(value, 800)).toLocaleString()}</>;
}

export default function Duel({ initial, headingLevel = 'h1' }: { initial: PollView; headingLevel?: 'h1' | 'h2' }) {
  const [poll, setPoll] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [photoOk, setPhotoOk] = useState<Record<string, boolean>>({});
  const panelRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const Heading = headingLevel;

  // Show a photo only once it has really loaded. Otherwise the initials stay (no broken-image icon).
  useEffect(() => {
    for (const o of poll.options) {
      if (!o.imageUrl || photoOk[o.id] !== undefined) continue;
      const img = new Image();
      img.onload = () => setPhotoOk((p) => ({ ...p, [o.id]: true }));
      img.onerror = () => setPhotoOk((p) => ({ ...p, [o.id]: false }));
      img.src = o.imageUrl;
    }
  }, [poll.options, photoOk]);

  const voted = poll.myVote !== null;
  const canVote = !poll.closed && (!voted || poll.allowChange);
  const revealed = poll.resultsVisible && voted;
  const pickedId = selected ?? poll.myVote;

  // Live updates every few seconds while the tab is visible.
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/polls/${poll.id}`, { cache: 'no-store' }).catch(() => null);
    if (res?.ok) setPoll(await res.json());
  }, [poll.id]);
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && !busy && refresh(), 6000);
    return () => clearInterval(t);
  }, [refresh, busy]);

  function select(id: string) {
    if (!canVote || busy || id === poll.myVote) return;
    navigator.vibrate?.(8);
    setSelected(id);
    setMsg('');
  }

  async function confirm() {
    if (!selected || busy) return;
    setBusy(true);
    setMsg('');
    navigator.vibrate?.([12, 40, 18]);
    const idx = poll.options.findIndex((o) => o.id === selected);
    const firstVote = !voted;
    const res = await fetch(`/api/polls/${poll.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId: selected }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) {
      setPoll(data.poll);
      setSelected(null);
      if (firstVote) {
        requestAnimationFrame(() => {
          const r = panelRefs.current[selected]?.getBoundingClientRect();
          if (r) confetti(r.left + r.width / 2, r.top + Math.min(r.height / 2, 220), [SIDE_HEX[idx] ?? '#7c6cff', '#c2ef72', '#ffffff', '#ffd166']);
        });
      }
    } else {
      setMsg(data?.error ?? 'Could not save your vote. Please try again.');
      if (res?.status === 409) { setSelected(null); refresh(); }
    }
    setBusy(false);
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
  const url = () => `${window.location.origin}/p/${poll.id}`;
  const shareText = myOption ? `I picked ${myOption.label}. Who would you pick?` : `${poll.options.map((o) => o.label).join(' vs ')}: who would you pick?`;
  const whatsapp = () => `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url()}`)}`;
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: poll.title, text: shareText, url: url() }); return; } catch { /* closed */ }
    }
    copy();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url());
    }
  }

  const sel = poll.options.find((o) => o.id === selected);
  const selIdx = poll.options.findIndex((o) => o.id === selected);
  const lead = revealed && poll.totalVotes > 0 ? poll.options.reduce((b, o) => (o.votes > b.votes ? o : b)).id : null;
  const tied = revealed && poll.options[0].votes === poll.options[1].votes;
  const showReasonStep = revealed && poll.reasons.length > 0 && !poll.myReason;
  const anyReasons = poll.options.slice(0, 2).some((o) => o.reasons.length > 0);

  return (
    <section className="duel" aria-labelledby={`t-${poll.id}`}>
      <header className="duel-head">
        <div className="duel-meta">
          <span className={'live-dot' + (poll.closed ? ' is-closed' : '')} aria-hidden />
          <span className="label">{poll.closed ? 'Poll ended' : 'Live now'}</span>
          <span className="small">
            · {poll.participants > 0 ? <><Num value={poll.participants} /> {poll.participants === 1 ? 'person has' : 'people have'} voted</> : 'Be the first to vote'}
          </span>
        </div>
        <Heading id={`t-${poll.id}`} className="duel-title">{poll.title}</Heading>
        {!voted && <p className="duel-sub">{poll.hideUntilVoted ? 'Pick one. The results unlock after you vote.' : 'Pick one to vote.'}</p>}
      </header>

      <div className={'arena' + (revealed ? ' is-revealed' : '')} role="group" aria-label="Choose one">
        {poll.options.slice(0, 2).map((o, i) => {
          const isSel = selected === o.id;
          const mine = poll.myVote === o.id && !selected;
          const dim = pickedId !== null && pickedId !== o.id;
          const grow = revealed ? Math.max(o.percent, 30) : 1;
          return (
            <button
              key={o.id}
              ref={(el) => { panelRefs.current[o.id] = el; }}
              className={'panel' + (isSel ? ' is-selected' : '') + (mine ? ' is-mine' : '') + (dim ? ' is-dim' : '') + (lead === o.id ? ' is-lead' : '')}
              style={{ '--side': SIDE[i], flexGrow: grow } as React.CSSProperties}
              disabled={!canVote || busy}
              aria-pressed={isSel || mine}
              onClick={() => select(o.id)}
            >
              <span className="panel-bg" aria-hidden />
              {o.imageUrl && photoOk[o.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="panel-photo" src={o.imageUrl} alt="" />
              ) : <span className="panel-mono" aria-hidden>{initials(o.label)}</span>}
              <span className="panel-shade" aria-hidden />
              <span className="panel-tags">
                {mine && <span className="tag tag-mine"><Check size={12} strokeWidth={3} /> Your vote</span>}
                {isSel && <span className="tag tag-mine"><Check size={12} strokeWidth={3} /> Selected</span>}
                {lead === o.id && !tied && <span className="tag tag-lead">Leading</span>}
              </span>
              <span className="panel-body">
                <span className="panel-text">
                  <span className="panel-name">{o.label}</span>
                  {revealed ? (
                    <span className="panel-sub"><Num value={o.votes} /> {o.votes === 1 ? 'vote' : 'votes'}</span>
                  ) : (
                    <span className="panel-sub">{canVote ? (isSel ? 'Selected' : 'Tap to select') : ''}</span>
                  )}
                </span>
                {revealed && (
                  <span className="panel-pct" aria-label={`${Math.round(o.percent)} percent`}>
                    <Pct value={o.percent} /><small>%</small>
                  </span>
                )}
              </span>
            </button>
          );
        })}
        <span className="vs" aria-hidden>VS</span>
      </div>

      {msg && <p className="error" role="alert">{msg}</p>}

      {/* Step 1: confirm. Sticks to the bottom of the screen so the next action is always obvious. */}
      {sel && canVote && (
        <div className="confirm" role="region" aria-label="Confirm your vote">
          <button className="confirm-btn" style={{ '--side': SIDE[selIdx] } as React.CSSProperties} onClick={confirm} disabled={busy}>
            {busy ? 'Casting your vote…' : voted ? `Change my vote to ${firstName(sel.label)}` : `Vote for ${firstName(sel.label)}`}
          </button>
          <button className="confirm-x" onClick={() => setSelected(null)} disabled={busy}>Cancel</button>
        </div>
      )}

      {/* Step 2: the reveal summary */}
      {revealed && myOption && (
        <div className="summary">
          <p className="summary-big">
            You&apos;re with <b style={{ color: SIDE[poll.options.indexOf(myOption)] }}><Pct value={myOption.percent} />%</b> of voters
          </p>
          <p className="small">You voted for {myOption.label}. {poll.allowChange && !poll.closed ? 'You can still change your vote.' : 'Vote counted.'}</p>
        </div>
      )}

      {/* Step 3: why */}
      {showReasonStep && (
        <div className="block">
          <h3>What made you pick {myOption?.label}?</h3>
          <p className="small">One tap. Optional.</p>
          <div className="chips">
            {poll.reasons.map((r) => <button key={r} className="chip-btn" onClick={() => pickReason(r)}>{r}</button>)}
          </div>
        </div>
      )}
      {revealed && anyReasons && (
        <div className="block">
          <h3>Why people pick them</h3>
          <div className="why-grid">
            {poll.options.slice(0, 2).map((o, i) => {
              const total = o.reasons.reduce((s, r) => s + r.n, 0);
              return (
                <div key={o.id}>
                  <p className="why-name" style={{ color: SIDE[i] }}>{o.label}</p>
                  {o.reasons.length === 0 && <p className="small">No answers yet</p>}
                  {o.reasons.slice(0, 4).map((r) => (
                    <div className="why-row" key={r.reason}>
                      <span>{r.reason}</span>
                      <span className="why-bar"><i style={{ width: `${(r.n / total) * 100}%`, background: SIDE[i] }} /></span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 4: share */}
      {voted && (
        <div className="block share-block">
          <h3>Challenge a friend</h3>
          <p className="small">Who would they pick? Send them the duel.</p>
          <div className="share">
            <a className="btn btn-primary btn-lg" href={whatsapp()} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} />WhatsApp</a>
            <button className="btn btn-ghost btn-lg" onClick={share}><Share2 size={16} />Share</button>
            <button className="btn btn-ghost btn-lg" onClick={copy}><Link2 size={16} />{copied ? 'Copied' : 'Copy link'}</button>
          </div>
        </div>
      )}

      <p className="small fineprint">Just for fun. Not an official or scientific poll.</p>
    </section>
  );
}
