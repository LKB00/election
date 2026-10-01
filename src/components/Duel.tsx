'use client';
import { ArrowRight, Check, Link2, Lock, MessageCircle, Share2, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PollOption, PollView } from '@/lib/polls';
import { confetti, useCountUp } from '@/lib/motion';

const SIDE = ['var(--side-a)', 'var(--side-b)'];
const SIDE_HEX = ['#6e5bff', '#ff4f7b'];

/** "Narendra Modi" -> { first: "Narendra", last: "Modi" } */
function splitName(label: string) {
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return { first: '', last: parts[0] };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

/** The headline after voting. Short, human, a little dramatic. */
function verdict(mine: PollOption, total: number) {
  // Uses the raw percent; the headline only needs the band, not the exact number.
  if (total <= 1) return { title: 'First vote is yours!', line: 'You started this duel. Now bring your friends in.' };
  const p = mine.percent;
  if (p >= 45 && p <= 55) return { title: 'Neck and neck', line: 'Every single vote matters here.' };
  if (p > 55) return { title: 'You’re with the crowd', line: `Most people picked ${splitName(mine.label).last} too.` };
  return { title: 'Bold pick', line: `You’re in the minority. Can your friends change that?` };
}

function Count({ value, ms = 1100 }: { value: number; ms?: number }) {
  return <>{Math.round(useCountUp(value, ms)).toLocaleString()}</>;
}

export default function Duel({ initial, headingLevel = 'h1' }: { initial: PollView; headingLevel?: 'h1' | 'h2' }) {
  const [poll, setPoll] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [photoOk, setPhotoOk] = useState<Record<string, boolean>>({});
  const stageRef = useRef<HTMLDivElement>(null);
  const Heading = headingLevel;

  const voted = poll.myVote !== null;
  const canVote = !poll.closed && (!voted || poll.allowChange);
  const revealed = poll.resultsVisible && voted;
  const [a, b] = poll.options;

  // Show a photo only after it really loaded (no broken-image icons).
  useEffect(() => {
    for (const o of poll.options) {
      if (!o.imageUrl || photoOk[o.id] !== undefined) continue;
      const img = new Image();
      img.onload = () => setPhotoOk((p) => ({ ...p, [o.id]: true }));
      img.onerror = () => setPhotoOk((p) => ({ ...p, [o.id]: false }));
      img.src = o.imageUrl;
    }
  }, [poll.options, photoOk]);

  // Live numbers while the tab is open.
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/polls/${poll.id}`, { cache: 'no-store' }).catch(() => null);
    if (res?.ok) setPoll(await res.json());
  }, [poll.id]);
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && !busy && refresh(), 6000);
    return () => clearInterval(t);
  }, [refresh, busy]);

  function pick(id: string) {
    if (!canVote || busy || id === poll.myVote) return;
    navigator.vibrate?.(8);
    setSelected((s) => (s === id ? null : id));
    setMsg('');
  }

  async function vote() {
    if (!selected || busy) return;
    setBusy(true);
    setMsg('');
    const idx = poll.options.findIndex((o) => o.id === selected);
    const firstVote = !voted;
    const res = await fetch(`/api/polls/${poll.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId: selected }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) {
      navigator.vibrate?.([10, 40, 20]);
      setPoll(data.poll);
      setSelected(null);
      if (firstVote) {
        requestAnimationFrame(() => {
          const r = stageRef.current?.getBoundingClientRect();
          if (r) confetti(r.left + r.width / 2, r.top + 120, [SIDE_HEX[idx] ?? '#6e5bff', '#ffffff', '#ffd166', SIDE_HEX[1 - idx] ?? '#ff4f7b']);
        });
        stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const mine = poll.options.find((o) => o.id === poll.myVote) ?? null;
  const mineIdx = mine ? poll.options.indexOf(mine) : -1;
  const sel = poll.options.find((o) => o.id === selected) ?? null;
  const selIdx = sel ? poll.options.indexOf(sel) : -1;

  const link = () => `${window.location.origin}/p/${poll.id}`;
  const shareText = mine ? `I picked ${mine.label}. Who would you pick? ⚡` : `${a.label} vs ${b.label}. Who would you pick?`;
  const whatsapp = () => `https://wa.me/?text=${encodeURIComponent(`${shareText} ${link()}`)}`;
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: poll.title, text: shareText, url: link() }); return; } catch { /* closed */ }
    }
    copy();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', link());
    }
  }

  const v = mine && revealed ? verdict(mine, poll.totalVotes) : null;
  // Whole numbers that always add up to 100 (63 + 38 = 101 looks broken).
  const pctA = poll.totalVotes ? Math.round(a.percent) : 0;
  const shown = [pctA, poll.totalVotes ? 100 - pctA : 0];
  const reasonStep = revealed && poll.reasons.length > 0 && !poll.myReason;
  const anyReasons = revealed && poll.options.some((o) => o.reasons.length > 0);

  return (
    <section className="duel" aria-labelledby={`t-${poll.id}`}>
      {/* 1. The question: one big, clear line */}
      <header className="hero">
        <p className="eyebrow">
          <span className={'live-dot' + (poll.closed ? ' is-closed' : '')} aria-hidden />
          {poll.closed ? 'Poll ended' : 'Live duel'}
          <span className="eyebrow-sep">·</span>
          {poll.participants > 0 ? <><Count value={poll.participants} ms={600} />&nbsp;{poll.participants === 1 ? 'vote' : 'votes'}</> : 'No votes yet'}
        </p>
        <Heading id={`t-${poll.id}`} className="hero-title">{poll.title}</Heading>
        {!revealed && poll.description && <p className="hero-sub">{poll.description}</p>}
      </header>

      {/* 2. The stage: the only dark thing on the page, so the eye goes here first */}
      <div ref={stageRef} className={'stage' + (revealed ? ' is-result' : '')}>
        {!revealed ? (
          <>
            <div className="fighters" role="group" aria-label="Pick one">
              {poll.options.slice(0, 2).map((o, i) => {
                const { first, last } = splitName(o.label);
                const isSel = selected === o.id;
                const isMine = poll.myVote === o.id;
                const other = (selected && !isSel) || (!selected && voted && !isMine);
                return (
                  <button
                    key={o.id}
                    className={'fighter' + (isSel ? ' is-on' : '') + (other ? ' is-off' : '') + (isMine ? ' is-mine' : '')}
                    style={{ '--side': SIDE[i] } as React.CSSProperties}
                    onClick={() => pick(o.id)}
                    disabled={!canVote || busy}
                    aria-pressed={isSel}
                  >
                    <span className="fighter-glow" aria-hidden />
                    {o.imageUrl && photoOk[o.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="fighter-photo" src={o.imageUrl} alt="" />
                    ) : (
                      <span className="fighter-ring" aria-hidden><span /></span>
                    )}
                    <span className="fighter-check" aria-hidden><Check size={16} strokeWidth={3.2} /></span>
                    <span className="fighter-text">
                      {o.subtitle && <span className="fighter-role">{o.subtitle}</span>}
                      {first && <span className="fighter-first">{first}</span>}
                      <span className="fighter-last">{last}</span>
                    </span>
                  </button>
                );
              })}
              <span className="vs" aria-hidden>VS</span>
            </div>

            <button
              className={'cast' + (sel ? ' is-ready' : '')}
              style={{ '--side': sel ? SIDE[selIdx] : undefined } as React.CSSProperties}
              disabled={!sel || busy || !canVote}
              onClick={vote}
            >
              {busy ? (
                <span className="cast-busy">Counting your vote…</span>
              ) : sel ? (
                <>Vote for {splitName(sel.label).last} <ArrowRight size={20} strokeWidth={2.6} /></>
              ) : poll.closed ? (
                'This duel has ended'
              ) : voted ? (
                'Tap the other side to switch'
              ) : (
                'Tap a side to pick'
              )}
            </button>
            <p className="stage-note"><Lock size={12} /> Anonymous · one vote each · results after you vote</p>
          </>
        ) : (
          <div className="result">
            {v && (
              <div className="verdict">
                <span className="verdict-badge" style={{ background: SIDE[mineIdx] }}><Check size={14} strokeWidth={3} /> You picked {splitName(mine!.label).last}</span>
                <h2 className="verdict-title">{v.title}</h2>
                <p className="verdict-line">{v.line}</p>
              </div>
            )}

            <div className="score" aria-label={`${a.label} ${shown[0]} percent, ${b.label} ${shown[1]} percent`}>
              {[a, b].map((o, i) => (
                <div key={o.id} className={'score-side' + (i === 1 ? ' is-right' : '') + (o.id === poll.myVote ? ' is-mine' : '')} style={{ '--side': SIDE[i] } as React.CSSProperties}>
                  <span className="score-name">{splitName(o.label).last}</span>
                  <span className="score-pct"><Count value={shown[i]} /><small>%</small></span>
                  <span className="score-votes"><Count value={o.votes} ms={800} /> votes</span>
                </div>
              ))}
            </div>
            <div className="bar" aria-hidden>
              <span className="bar-a" style={{ flexGrow: poll.totalVotes ? Math.max(a.percent, 2) : 1 }} />
              <span className="bar-b" style={{ flexGrow: poll.totalVotes ? Math.max(b.percent, 2) : 1 }} />
            </div>
            {poll.allowChange && !poll.closed && (
              <button className="switch" onClick={() => setPoll({ ...poll, resultsVisible: false })}>Change my vote</button>
            )}
          </div>
        )}
      </div>

      {msg && <p className="error" role="alert">{msg}</p>}

      {/* 3. After the vote: share first (that is the fun), then why, then more */}
      {revealed && mine && (
        <div className="after">
          <div className="share-card">
            <div className="share-preview" style={{ '--side': SIDE[mineIdx] } as React.CSSProperties} aria-hidden>
              <span className="share-preview-kicker"><Sparkles size={12} /> My pick</span>
              <span className="share-preview-name">{splitName(mine.label).last}</span>
              <span className="share-preview-q">Who would you pick?</span>
            </div>
            <div className="share-copy">
              <h3>Dare your friends</h3>
              <p>Send the duel. See who agrees with you.</p>
            </div>
            <div className="share-actions">
                <a className="btn btn-whatsapp btn-lg" href={whatsapp()} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />WhatsApp</a>
                <button className="btn btn-ghost btn-lg btn-icon" onClick={share} aria-label="Share"><Share2 size={18} /></button>
                <button className="btn btn-ghost btn-lg btn-icon" onClick={copy} aria-label="Copy link">{copied ? <Check size={18} /> : <Link2 size={18} />}</button>
            </div>
          </div>

          {reasonStep && (
            <div className="panel-card">
              <p className="eyebrow">Quick one · optional</p>
              <h3>Why {splitName(mine.label).last}?</h3>
              <div className="chips">
                {poll.reasons.map((r) => <button key={r} className="chip-btn" onClick={() => pickReason(r)}>{r}</button>)}
              </div>
            </div>
          )}

          {anyReasons && (
            <div className="panel-card">
              <p className="eyebrow">What voters say</p>
              <h3>Why people pick them</h3>
              <div className="why-grid">
                {[a, b].map((o, i) => {
                  const total = o.reasons.reduce((s, r) => s + r.n, 0);
                  return (
                    <div key={o.id}>
                      <p className="why-name" style={{ color: SIDE[i] }}>{splitName(o.label).last}</p>
                      {o.reasons.length === 0 && <p className="small">No answers yet</p>}
                      {o.reasons.slice(0, 3).map((r) => (
                        <div className="why-row" key={r.reason}>
                          <span>{r.reason} <b>{Math.round((r.n / total) * 100)}%</b></span>
                          <span className="why-bar"><i style={{ width: `${(r.n / total) * 100}%`, background: SIDE[i] }} /></span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="fineprint">Just for fun. Not an official or scientific poll.</p>
    </section>
  );
}
