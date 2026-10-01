'use client';
import Link from 'next/link';
import { ArrowRight, Check, Flame, Link2, MessageCircle, Plus, Share2, Trophy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PollOption, PollView } from '@/lib/polls';
import { announceVote, useStats } from '@/lib/useStats';
import Burst from './Burst';

// Duels, played like patricka's "This or That": tap a card, see the result on the
// cards, then "Next duel". Results stay hidden until you vote.
const LETTERS = 'ABCDEFGHIJ';
const TONES = ['input', 'feedback', 'control', 'agents', 'output', 'trust'];

function splitName(label: string) {
  const parts = label.trim().split(/\s+/);
  return parts.length === 1 ? { first: '', last: parts[0] } : { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}
const initials = (label: string) => label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

/** Whole-number percentages that always add up to 100. */
function rounded(opts: PollOption[], total: number) {
  if (!total) return opts.map(() => 0);
  const raw = opts.map((o) => o.percent);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((s, n) => s + n, 0);
  raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => {
    if (left-- > 0) out[i]++;
  });
  return out;
}

function verdict(poll: PollView, mine: PollOption) {
  if (poll.totalVotes <= 1) return ['First vote!', 'You started this duel. Bring your friends in.'];
  const top = Math.max(...poll.options.map((o) => o.percent));
  const p = mine.percent;
  if (Math.abs(top - p) < 0.01 && poll.options.filter((o) => Math.abs(o.percent - top) < 3).length > 1) return ['Neck and neck.', 'Every vote counts here.'];
  if (Math.abs(top - p) < 0.01) return ['You’re with the crowd.', `Most people picked ${splitName(mine.label).last} too.`];
  return ['Bold pick.', 'You’re in the minority. Can your friends change that?'];
}

function timeAgo(iso: string | null) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

function Face({ o, tone }: { o: PollOption; tone: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!o.imageUrl) return;
    const img = new Image();
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = o.imageUrl;
  }, [o.imageUrl]);
  return (
    <span className={`duel-face tone-${tone}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {o.imageUrl && ok ? <img src={o.imageUrl} alt="" /> : <span>{initials(o.label)}</span>}
    </span>
  );
}

export default function DuelGame({ deck: initialDeck, start = 0 }: { deck: PollView[]; start?: number }) {
  const [deck, setDeck] = useState(initialDeck);
  const [i, setI] = useState(() => {
    const firstOpen = initialDeck.findIndex((p, n) => n >= start && p.myVote === null && !p.closed);
    return firstOpen === -1 ? start : firstOpen;
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [over, setOver] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const { streak } = useStats();

  const poll = deck[i];
  const voted = poll?.myVote != null;
  const revealed = !!poll && voted && poll.resultsVisible;
  const votedCount = deck.filter((p) => p.myVote !== null).length;
  const pcts = useMemo(() => (poll ? rounded(poll.options, poll.totalVotes) : []), [poll]);
  const mine = poll?.options.find((o) => o.id === poll.myVote) ?? null;

  const replace = (p: PollView) => setDeck((d) => d.map((x) => (x.id === p.id ? p : x)));

  // Live numbers for the open duel.
  const refresh = useCallback(async () => {
    if (!poll) return;
    const res = await fetch(`/api/polls/${poll.id}`, { cache: 'no-store' }).catch(() => null);
    if (res?.ok) replace(await res.json());
  }, [poll]);
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && !busy && refresh(), 8000);
    return () => clearInterval(t);
  }, [refresh, busy]);

  async function vote(optionId: string) {
    if (!poll || voted || busy || poll.closed) return;
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
      replace(data.poll);
      setJustVoted(optionId);
      announceVote(poll.id);
      setTimeout(() => nextRef.current?.focus({ preventScroll: true }), 50);
    } else {
      setMsg(data?.error ?? 'Could not save your vote. Try again.');
      if (res?.status === 409) refresh();
    }
    setBusy(null);
  }

  async function post(path: string, body: object) {
    if (!poll) return;
    const res = await fetch(`/api/polls/${poll.id}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) replace(data.poll);
  }

  function next() {
    setJustVoted(null);
    setMsg('');
    const after = deck.findIndex((p, n) => n > i && p.myVote === null && !p.closed);
    if (after !== -1) setI(after);
    else setOver(true);
  }

  const link = () => `${window.location.origin}/p/${poll?.id}`;
  const shareText = () => (mine ? `I picked ${mine.label}. Who would you pick?` : `${poll?.title} Who would you pick?`);
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: poll?.title, text: shareText(), url: link() });
        return;
      } catch {
        /* closed */
      }
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

  if (!poll) return null;

  if (over) {
    return (
      <div className="tot tot-over">
        <Burst count={24} />
        <Trophy size={28} strokeWidth={1.5} aria-hidden />
        <p className="tot-big">{votedCount}<span>/{deck.length}</span></p>
        <p className="tot-verdict">All caught up! You voted in every duel.</p>
        <div className="tot-stats">
          <span><Flame size={14} strokeWidth={1.75} aria-hidden /> Day streak: <strong>{streak}</strong></span>
        </div>
        <div className="row wrap center">
          <Link href="/create" className="btn btn-primary btn-lg"><Plus size={15} strokeWidth={1.75} aria-hidden /> Start your own duel</Link>
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => { setOver(false); setI(0); }}>See results again</button>
        </div>
      </div>
    );
  }

  const [vTitle, vLine] = mine && revealed ? verdict(poll, mine) : ['', ''];

  return (
    <div className="tot duel">
      <div className="tot-bar">
        <span className="tot-round" aria-label={`Duel ${i + 1} of ${deck.length}`}>
          {deck.map((p, n) => (
            <span key={p.id} className={'tot-pip' + (p.myVote !== null ? ' is-right' : '') + (n === i ? ' is-now' : '')} />
          ))}
        </span>
        <span className="tot-score" title="Duels you voted in"><Check size={14} strokeWidth={2.25} aria-hidden /> {votedCount}</span>
        <span className={'tot-streak' + (streak >= 3 ? ' is-hot' : '')} key={streak} title="Day streak">
          <Flame size={14} strokeWidth={1.75} aria-hidden /> {streak}
        </span>
      </div>

      <div className="tot-q">
        <div className="row wrap">
          <span className="tag duel-tag">{poll.category}</span>
          <span className="tag duel-live"><span className="duel-dot" aria-hidden /> {poll.closed ? 'Ended' : 'Live'} · {poll.participants.toLocaleString()} {poll.participants === 1 ? 'vote' : 'votes'}</span>
        </div>
        <h3 aria-level={2}>{poll.title}</h3>
        <p>
          {revealed
            ? 'Here is where everyone stands.'
            : poll.pulse.lastHour > 0
              ? `${poll.pulse.lastHour} ${poll.pulse.lastHour === 1 ? 'person' : 'people'} voted in the last hour. Tap your pick.`
              : poll.description || 'Tap your pick. Results unlock after you vote.'}
        </p>
      </div>

      <div className={'tot-options duel-options n-' + poll.options.length}>
        {poll.options.map((o, n) => {
          const isMine = poll.myVote === o.id;
          const lead = revealed && poll.totalVotes > 0 && pcts[n] === Math.max(...pcts);
          const { first, last } = splitName(o.label);
          return (
            <button
              key={o.id}
              type="button"
              className={'tot-option duel-option' + (isMine ? ' is-mine' : '') + (revealed && !isMine ? ' is-other' : '') + (busy === o.id ? ' is-busy' : '')}
              style={{ '--pc': `var(--p-${TONES[n % TONES.length]})`, '--dc': `var(--d-${TONES[n % TONES.length]})` } as React.CSSProperties}
              onClick={() => vote(o.id)}
              disabled={voted || !!busy || poll.closed}
              aria-label={`${o.label}${revealed ? `, ${pcts[n]} percent` : ''}`}
            >
              <span className="tot-letter">{isMine ? <Check size={13} strokeWidth={2.5} aria-hidden /> : LETTERS[n]}</span>
              {revealed && (lead || isMine) && <span className="tot-caption">{isMine ? 'Your pick' : 'Leading'}{isMine && lead ? ' · leading' : ''}</span>}
              <span className="duel-body">
                <Face o={o} tone={TONES[n % TONES.length]} />
                <span className="duel-text">
                  {o.subtitle && <span className="duel-role">{o.subtitle}</span>}
                  <span className="duel-name">
                    {first && <span className="duel-first">{first} </span>}
                    <span className="duel-last">{last}</span>
                  </span>
                </span>
                {revealed && <span className="duel-pct">{pcts[n]}<small>%</small></span>}
              </span>
              {revealed && (
                <span className="duel-meter" aria-hidden>
                  <i style={{ width: `${pcts[n]}%` }} />
                </span>
              )}
              {revealed && <span className="duel-votes">{o.votes.toLocaleString()} {o.votes === 1 ? 'vote' : 'votes'}</span>}
              {justVoted === o.id && <Burst />}
            </button>
          );
        })}
      </div>

      {msg && <p className="duel-error" role="alert">{msg}</p>}

      {revealed && mine && (
        <div className="duel-after">
          {poll.myVoterNumber && <span className="pill-new duel-no">You’re voter #{poll.myVoterNumber.toLocaleString()}</span>}

          {poll.reasons.length > 0 && !poll.myReason && (
            <div className="duel-why">
              <p className="label">Why {splitName(mine.label).last}? One tap, optional</p>
              <div className="row wrap">
                {poll.reasons.map((r) => (
                  <button key={r} type="button" className="chip" onClick={() => post('reason', { reason: r })}>{r}</button>
                ))}
              </div>
            </div>
          )}

          <div className="duel-react" role="group" aria-label="React">
            {poll.reactions.map((r) => {
              const on = poll.myReactions.includes(r.emoji);
              return (
                <button key={r.emoji} type="button" className={'chip duel-emoji' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => post('react', { emoji: r.emoji })}>
                  <span>{r.emoji}</span>{r.n > 0 && <strong>{r.n}</strong>}
                </button>
              );
            })}
          </div>

          <div className="duel-share">
            <a className="btn btn-primary duel-wa" href={`https://wa.me/?text=${encodeURIComponent(`${shareText()} ${typeof window !== 'undefined' ? link() : ''}`)}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={15} strokeWidth={1.75} aria-hidden /> Dare a friend on WhatsApp
            </a>
            <button type="button" className="btn btn-ghost" onClick={share}><Share2 size={15} strokeWidth={1.75} aria-hidden /> Share</button>
            <button type="button" className="btn btn-ghost" onClick={copy}><Link2 size={15} strokeWidth={1.75} aria-hidden /> {copied ? 'Copied' : 'Copy link'}</button>
          </div>
        </div>
      )}

      <div className={'tot-result' + (revealed ? ' is-shown' : '')} aria-live="polite">
        {revealed && mine ? (
          <>
            <p><strong className="txt-good">{vTitle}</strong> {vLine}</p>
            <button type="button" className="btn btn-primary" onClick={next} ref={nextRef}>
              Next duel <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
            </button>
          </>
        ) : (
          <p className="tot-keys">
            {poll.closed ? 'This duel has ended.' : `Tap a card to vote · anonymous · one vote each${poll.pulse.lastVoteAt ? ` · last vote ${timeAgo(poll.pulse.lastVoteAt)}` : ''}`}
          </p>
        )}
      </div>
    </div>
  );
}
