'use client';
import Link from 'next/link';
import { ArrowRight, CalendarPlus, Check, Flag, Lock, Plus, Share2, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { PollOption, PollView } from '@/lib/polls';
import { announceVote } from '@/lib/useStats';
import Burst from './Burst';
import InkFinger from './InkFinger';
import CastVote from './CastVote';
import ShareSheet from './ShareSheet';
import { evmBeep, keyClick } from '@/lib/sound';
import { humanToken, prepareHumanCheck } from '@/lib/turnstile-client';
import { useLang, useT } from '@/lib/lang';
import { apiMsg, reasonLabel, type Dict, type Lang } from '@/lib/i18n';
import { faceLabels } from '@/lib/labels';

// Duels, played like patricka's "This or That": tap a card, see the result on the
// cards, then "Next duel". Results stay hidden until you vote.
// Ballot serial numbers, like the EVM and the VVPAT slip (1, 2, 3…). Keys A/B… still work too.
const LETTERS = 'ABCDEFGHIJ';
const serial = (n: number) => String(n + 1);
const TONES = ['input', 'feedback', 'control', 'agents', 'output', 'trust'];

// The cast-vote moment is full length on your first vote of a visit, then shorter (a ritual, not a wait).
let votesThisVisit = 0;

/** Whole-number percentages that always add up to 100. */
function rounded(opts: PollOption[], total: number, counts?: Record<string, number>) {
  if (!total) return opts.map(() => 0);
  const raw = counts ? opts.map((o) => ((counts[o.id] ?? 0) / total) * 100) : opts.map((o) => o.percent);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((s, n) => s + n, 0);
  raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => {
    if (left-- > 0) out[i]++;
  });
  return out;
}

function verdict(t: Dict, poll: PollView, mine: PollOption) {
  if (poll.totalVotes <= 1) return t.firstVote;
  const top = Math.max(...poll.options.map((o) => o.percent));
  const p = mine.percent;
  if (Math.abs(top - p) < 0.01 && poll.options.filter((o) => Math.abs(o.percent - top) < 3).length > 1) return t.neck;
  if (Math.abs(top - p) < 0.01) return t.crowd(mine.label);
  return t.bold;
}

function timeAgo(iso: string | null) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

// The face is how people recognise a candidate (P1), so a real photo gets the full card width.
// No photo, or it fails to load: a soft initials circle instead (never a broken image).
// Our own candidate photos also come as small WebP files (about half the data); share images keep the JPEG.
const lighter = (url: string) => (url.startsWith('/candidates/') && url.endsWith('.jpg') ? url.replace(/\.jpg$/, '.webp') : url);

function Face({ o, tone, letters }: { o: PollOption; tone: string; letters: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const src = o.imageUrl ? lighter(o.imageUrl) : null;
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = src;
  }, [src]);
  if (o.imageUrl && ok !== false) {
    return (
      <span className={`duel-photo tone-${tone}`} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {ok && <img src={src!} alt="" />}
      </span>
    );
  }
  return (
    <span className={`duel-face tone-${tone}` + (o.emoji ? ' has-emoji' : '')} aria-hidden>
      <span>{o.emoji ?? letters}</span>
    </span>
  );
}

function closesIn(t: Dict, iso: string) {
  const s = Math.max(0, (new Date(iso).getTime() - Date.now()) / 1000);
  if (s < 3600) return t.inMin(Math.max(1, Math.floor(s / 60)));
  if (s < 86400) return t.inH(Math.floor(s / 3600));
  return t.inDH(Math.floor(s / 86400), Math.floor((s % 86400) / 3600));
}

const isOpen = (p: PollView) => p.myVote === null && !p.closed;

// Numbers count up to their new value, like the tally on TV counting day (instant when the phone asks for less motion).
function Tween({ value, render }: { value: number; render: (v: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      from.current = value;
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 550);
      const v = Math.round(start + (value - start) * (1 - (1 - k) ** 3));
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{render(shown)}</>;
}

// "Sealed till 5 Feb, 6:00 pm": India time, so the server page and the phone print the same.
const sealedWhen = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

// "Report this duel" (P3, last on the screen): one tap opens the reasons, one more sends it.
function ReportDuel({ pollId, t, lang }: { pollId: string; t: Dict; lang: Lang }) {
  const [state, setState] = useState<'closed' | 'open' | 'busy' | 'sent'>('closed');
  const [error, setError] = useState('');
  useEffect(() => {
    setState('closed');
    setError('');
  }, [pollId]);
  // "Thanks" only once the report has really arrived; otherwise say why, and the reasons stay open to try again.
  async function send(reason: string) {
    setState('busy');
    setError('');
    const res = await fetch(`/api/polls/${pollId}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }).catch(() => null);
    if (res?.ok) return setState('sent');
    const data = await res?.json().catch(() => null);
    setError(data?.error ? apiMsg(lang, data.error) : t.reportFail);
    setState('open');
  }
  if (state === 'sent') return <p className="small muted duel-report" role="status">{t.reportThanks}</p>;
  if (state === 'closed') {
    return (
      <p className="small duel-report">
        <button type="button" className="link-like muted" onClick={() => setState('open')}><Flag size={12} strokeWidth={1.75} aria-hidden /> {t.reportDuel}</button>
      </p>
    );
  }
  return (
    <div className="duel-group duel-report">
      <p className="label">{t.reportWhy}</p>
      <div className="row wrap">
        {Object.entries(t.reportReasons).map(([key, label]) => (
          <button key={key} type="button" className="chip" disabled={state === 'busy'} onClick={() => send(key)}>{label}</button>
        ))}
        <button type="button" className="link-like small muted" onClick={() => setState('closed')}>{t.cancel}</button>
      </div>
      {error && <p className="small duel-error" role="alert">{error}</p>}
    </div>
  );
}

// How the race moved: the first choice's share over time, with the 50% majority line. Like the odds line on poll trackers.
function Sparkline({ points, label, aria }: { points: number[]; label: string; aria: (l: string) => string }) {
  const w = 120;
  const h = 32;
  const y = (v: number) => h - (v / 100) * h;
  const d = points.map((v, k) => `${k ? 'L' : 'M'}${((k / (points.length - 1)) * w).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg className="duel-spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={aria(label)}>
      <line x1="0" x2={w} y1={h / 2} y2={h / 2} className="duel-spark-mid" />
      <path d={d} className="duel-spark-line" />
    </svg>
  );
}

// start: given for a shared link (always open that duel, even if it ended or you voted).
// Not given (Home): the first live duel you have not voted in, or "all caught up".
export default function DuelGame({ deck: initialDeck, start, via }: { deck: PollView[]; start?: number; via?: string | null }) {
  const t = useT();
  const lang = useLang();
  const [deck, setDeck] = useState(initialDeck);
  const firstOpen = initialDeck.findIndex(isOpen);
  const [i, setI] = useState(start ?? Math.max(firstOpen, 0));
  const [busy, setBusy] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [over, setOver] = useState(start === undefined && firstOpen === -1);
  const [undoUntil, setUndoUntil] = useState(0);
  const [reasonSaved, setReasonSaved] = useState(false);
  // The cast-vote moment (EVM, VVPAT slip, ink) plays over the page; results wait until it is done.
  const [casting, setCasting] = useState<{ optionId: string; short: boolean } | null>(null);
  const [sharing, setSharing] = useState(false);
  // Which duel you just voted in (plays the ink animation once).
  const [inkedFor, setInkedFor] = useState<string | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const guessRef = useRef<HTMLDivElement>(null);
  // The "are you a person?" check (only when switched on) gets ready in the background.
  useEffect(() => prepareHumanCheck(), []);

  const poll = deck[i];
  // The friend's code only belongs to the duel they shared (the first one on a shared link).
  const viaHere = poll && start !== undefined && i === start ? via ?? null : null;
  const q = viaHere ? `?f=${encodeURIComponent(viaHere)}` : '';
  const voted = poll?.myVote != null;
  const revealed = !!poll && !casting && poll.resultsVisible && (voted || poll.closed);
  // Election silence window: no numbers for anyone, but the pinned bar still offers Share and Next.
  const sealed = !!poll?.sealedUntil;
  const barOn = revealed || (!casting && sealed && (voted || !!poll?.closed));
  const votedCount = deck.filter((p) => p.myVote !== null).length;
  // Counting day: when results open in front of you, they are counted in 3 rounds (real vote order), like TV on counting day.
  const [countRound, setCountRound] = useState<number | null>(null);
  const wasRevealed = useRef<{ id: string; on: boolean } | null>(null);
  // Runs on the duel and on "revealed" only: new data arriving mid-count (a reaction, a refresh) must not stop the
  // count halfway, which used to leave the bar stuck on "round 1 of 3" with no Next button.
  const countId = poll?.id;
  const countRounds = poll?.rounds.length ?? 0;
  useEffect(() => {
    if (!countId) return;
    const before = wasRevealed.current;
    wasRevealed.current = { id: countId, on: revealed };
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!before || before.id !== countId || before.on || !revealed || countRounds !== 3 || reduce) return;
    setCountRound(0);
    const t1 = setTimeout(() => setCountRound(1), 650);
    const t2 = setTimeout(() => setCountRound(2), 1300);
    const t3 = setTimeout(() => setCountRound(null), 1950);
    return () => {
      [t1, t2, t3].forEach(clearTimeout);
      setCountRound(null);
    };
  }, [countId, revealed, countRounds]);
  const counting = countRound !== null && !!poll && poll.rounds.length === 3;
  const shown = counting ? poll!.rounds[countRound!] : null;
  const shownTotal = shown ? Object.values(shown).reduce((a, b) => a + b, 0) : poll?.totalVotes ?? 0;
  const pcts = useMemo(() => (poll ? rounded(poll.options, shownTotal, shown ?? undefined) : []), [poll, shownTotal, shown]);
  const votesOf = (o: PollOption) => (shown ? shown[o.id] ?? 0 : o.votes);
  // The TV ticker line during counting: "Modi ahead by 412" (or "level").
  const ticker = (() => {
    if (!shown || !poll) return '';
    const byVotes = poll.options.map((o) => ({ o, n: shown[o.id] ?? 0 })).sort((a, b) => b.n - a.n);
    if (byVotes.length < 2 || byVotes[0].n === byVotes[1].n) return t.level;
    return t.aheadBy(byVotes[0].o.label, byVotes[0].n - byVotes[1].n);
  })();
  const mine = poll?.options.find((o) => o.id === poll.myVote) ?? null;
  // The vote moment shows the choice you pressed (not the poll data, which a late refresh could have changed).
  const castOpt = casting ? poll?.options.find((o) => o.id === casting.optionId) ?? null : null;
  // "Leading" / "won" only when one choice is clearly ahead (a tie has no leader).
  const top = pcts.length ? Math.max(...pcts) : 0;
  const leaderIdx = revealed && poll && poll.totalVotes > 0 && pcts.filter((v) => v === top).length === 1 ? pcts.indexOf(top) : -1;
  // The race line follows the choice in the swing line (else the leader). Two-choice duels only (the trend is the first choice's share).
  const sparkOpt = poll ? poll.options.find((o) => o.id === poll.swing?.optionId) ?? (leaderIdx >= 0 ? poll.options[leaderIdx] : poll.options[0]) : null;
  // Declared result: the winner and the margin over the runner-up, in votes.
  const sortedVotes = poll ? poll.options.map((o) => o.votes).sort((a, b) => b - a) : [];
  const margin = sortedVotes.length > 1 ? sortedVotes[0] - sortedVotes[1] : sortedVotes[0] ?? 0;
  // A declared result gets one celebration, the first time you see it.
  const [declaredBurst, setDeclaredBurst] = useState(false);
  useEffect(() => {
    if (!poll?.closed || !revealed || leaderIdx < 0) return;
    try {
      const key = `declared:${poll.id}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        setDeclaredBurst(true);
      }
    } catch {
      /* private mode */
    }
  }, [poll?.closed, poll?.id, revealed, leaderIdx]);

  const replace = (p: PollView) => {
    fetchedAt.current[p.id] = Date.now();
    setDeck((d) => d.map((x) => (x.id === p.id ? p : x)));
  };
  // Every vote, guess, undo, reaction bumps this. A refresh that started before one of them is thrown away when it
  // lands, so old numbers never overwrite your vote (that used to bring the Vote buttons back and freeze the screen).
  const gen = useRef(0);
  // When each duel's numbers were last fetched: "N new votes just now" only compares with a recent fetch.
  const fetchedAt = useRef<Record<string, number>>({});

  // "3 new votes just now": votes from other people that arrive while you watch (shown for a few seconds).
  const [fresh, setFresh] = useState<{ id: string; n: number } | null>(null);
  useEffect(() => {
    if (!fresh) return;
    const timer = setTimeout(() => setFresh(null), 5000);
    return () => clearTimeout(timer);
  }, [fresh]);

  // Live numbers for the open duel.
  const refresh = useCallback(async () => {
    if (!poll) return;
    const started = gen.current;
    const res = await fetch(`/api/polls/${poll.id}${q}`, { cache: 'no-store' }).catch(() => null);
    if (!res?.ok || started !== gen.current) return;
    const next: PollView | null = await res.json().catch(() => null);
    if (!next?.id || started !== gen.current) return;
    const gained = next.participants - poll.participants;
    const recent = Date.now() - (fetchedAt.current[next.id] ?? 0) < 15_000;
    if (gained > 0 && recent && next.myVote === poll.myVote) setFresh({ id: next.id, n: gained });
    replace(next);
  }, [poll, q]);
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && !busy && !casting && refresh(), 8000);
    return () => clearInterval(t);
  }, [refresh, busy, casting]);

  // One vote waiting for the internet at most (tapping again while offline replaces it, never adds a second).
  const queued = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      if (!queued.current) return;
      window.removeEventListener('online', queued.current);
      queued.current = null;
      setBusy(null);
    },
    [countId],
  );
  async function vote(optionId: string) {
    if (!poll || voted || busy || poll.closed) return;
    gen.current++;
    setBusy(optionId);
    setMsg('');
    // Feedback the instant you press (the beep and the scene follow once the vote is saved).
    keyClick();
    navigator.vibrate?.(12);
    const human = await humanToken();
    const res = await fetch(`/api/polls/${poll.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId, via: viaHere, human }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.poll) {
      evmBeep();
      setInkedFor(poll.id);
      replace(data.poll);
      setReasonSaved(false);
      announceVote(poll.id, 1);
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduce) castDone(optionId, data.poll.needsGuess);
      else setCasting({ optionId, short: votesThisVisit++ > 0 });
    } else if (!res && !navigator.onLine) {
      // No internet: keep the choice and send it by itself when the phone is back online.
      // The keys stay pressed (busy) until then, so a second tap cannot queue a second vote.
      setMsg(t.noNet);
      if (queued.current) window.removeEventListener('online', queued.current);
      const retry = () => {
        queued.current = null;
        setMsg('');
        setBusy(null);
        vote(optionId);
      };
      queued.current = retry;
      window.addEventListener('online', retry, { once: true });
      return;
    } else {
      setMsg(data?.error ? apiMsg(lang, data.error) : t.saveFail);
      // Already voted, the duel just ended, or it was taken down: show what is true now.
      if (res) refresh();
    }
    setBusy(null);
  }

  // The cast-vote moment ended (or was tapped away): now the result, the confetti and the next step.
  function castDone(optionId: string, needsGuess: boolean) {
    setCasting(null);
    setJustVoted(needsGuess ? null : optionId);
    setUndoUntil(Date.now() + 20_000); // the server allows 30 s from the vote; the moment took up to 5 of them
    focusAfter.current = true;
  }
  // Keyboard and screen-reader users land on the next step once the screen has settled (after the count):
  // the exit poll question if it is asked, else Next.
  const focusAfter = useRef(false);
  useEffect(() => {
    if (!focusAfter.current || casting || counting || !poll) return;
    const target = poll.needsGuess ? guessRef.current?.querySelector<HTMLElement>('h2') : nextRef.current;
    if (!target) return;
    focusAfter.current = false;
    target.focus({ preventScroll: true });
  });

  const [guessBusy, setGuessBusy] = useState(false);
  const [justGuessed, setJustGuessed] = useState(false);
  async function guess(choice: string) {
    if (!poll || guessBusy) return;
    gen.current++;
    setGuessBusy(true);
    navigator.vibrate?.(10);
    const res = await fetch(`/api/polls/${poll.id}/guess${q}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choice }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.poll) {
      replace(data.poll);
      setJustGuessed(choice !== 'skip');
      if (data.poll.myGuess?.correct) setJustVoted(poll.myVote);
      focusAfter.current = true;
    } else {
      setMsg(data?.error ? apiMsg(lang, data.error) : t.saveFail2);
      refresh();
    }
    setGuessBusy(false);
  }

  async function undo() {
    if (!poll) return;
    gen.current++;
    setUndoUntil(0);
    const res = await fetch(`/api/polls/${poll.id}/vote${q}`, { method: 'DELETE' }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.poll) {
      replace(data.poll);
      setJustVoted(null);
      scrolledFor.current = null; // vote again: the exit poll comes into view again
      announceVote(poll.id, -1);
    } else setMsg(data?.error ? apiMsg(lang, data.error) : t.undoLate);
  }

  // After the ink moment, bring the exit poll question onto the screen (it used to sit below the fold).
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!poll || casting || !poll.needsGuess || inkedFor !== poll.id || scrolledFor.current === poll.id) return;
    scrolledFor.current = poll.id;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => guessRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }), 300);
    return () => clearTimeout(timer);
  }, [poll, casting, inkedFor]);

  // A first-timer who has not tapped for a few seconds: the blue Vote keys pulse softly, a few times, then stop.
  const [nudge, setNudge] = useState(false);
  const nudgeable = !!poll && poll.myVote === null && !poll.closed;
  const pollId = poll?.id;
  useEffect(() => {
    setNudge(false);
    if (!nudgeable) return;
    const timer = setTimeout(() => setNudge(true), 5000);
    const stop = () => {
      clearTimeout(timer);
      setNudge(false);
    };
    window.addEventListener('pointerdown', stop, { once: true });
    window.addEventListener('scroll', stop, { once: true, passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', stop);
      window.removeEventListener('scroll', stop);
    };
  }, [pollId, nudgeable]);

  // The undo link hides itself when its time is up.
  useEffect(() => {
    if (!undoUntil) return;
    const t = setTimeout(() => setUndoUntil(0), Math.max(0, undoUntil - Date.now()));
    return () => clearTimeout(t);
  }, [undoUntil]);

  // One at a time: a double tap on a reaction must not send two toggles that land in the wrong order.
  const posting = useRef(false);
  async function post(path: string, body: object) {
    if (!poll || posting.current) return;
    posting.current = true;
    gen.current++;
    const res = await fetch(`/api/polls/${poll.id}/${path}${q}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    posting.current = false;
    if (res?.ok && data?.poll) {
      replace(data.poll);
      if (path === 'reason') setReasonSaved(true);
    } else setMsg(data?.error ? apiMsg(lang, data.error) : t.saveFail2);
  }

  // Next: the next live duel you have not voted in (wraps around), else "all caught up".
  // Always brings the top of the game into view, so the new question is the first thing you see.
  function next() {
    // A fresh ballot slides in (View Transitions), unless the phone asks for less motion or the browser cannot.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (doc.startViewTransition && !reduce) doc.startViewTransition(() => flushSync(goNext));
    else goNext();
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }));
  }
  function goNext() {
    setCasting(null);
    setSharing(false);
    setJustVoted(null);
    setJustGuessed(false);
    setReasonSaved(false);
    setMsg('');
    setUndoUntil(0);
    const order = [...deck.keys()].map((k) => (i + 1 + k) % deck.length);
    const after = order.find((n) => isOpen(deck[n]));
    if (after !== undefined) setI(after);
    else setOver(true);
  }

  // Keyboard, like patricka's games: A/B/C… or 1/2/3… to vote, Enter for Next.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (!poll || over) return;
      const k = e.key.toLowerCase();
      const n = /^[1-9]$/.test(k) ? Number(k) - 1 : LETTERS.toLowerCase().indexOf(k);
      if (!revealed && n >= 0 && n < poll.options.length) vote(poll.options[n].id);
      if (e.key === 'Enter' && revealed && !counting && !t.closest('button, a')) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const link = () => `${window.location.origin}/p/${poll?.id}${poll?.myShareCode ? `?f=${poll.myShareCode}` : ''}`;
  const shareText = () => (mine ? t.shareTextPick(mine.label) : t.shareTextAsk(poll?.title ?? ''));
  // Phones: the share sheet (WhatsApp is in it). Computers: copy the link, then say so.
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: poll?.title, text: shareText(), url: link() });
      } catch (e) {
        // Closed the phone's share menu: done. Only a real failure falls back to copying the link.
        if ((e as Error)?.name !== 'AbortError') copy();
      }
      return;
    }
    copy();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.copyThis, link());
    }
  }

  if (!poll) return null;

  if (over) {
    return (
      <div className="tot tot-over" ref={topRef}>
        <InkFinger size={64} />
        <h1 className="display duel-q">{t.allDone}</h1>
        <p className="tot-verdict">{t.allDoneNote}</p>
        <div className="row wrap center">
          <Link href="/create" className="btn btn-primary btn-lg"><Plus size={15} strokeWidth={1.75} aria-hidden /> {t.startOwn}</Link>
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => { setOver(false); setI(0); }}>{t.seeResults}</button>
        </div>
      </div>
    );
  }

  const [vTitle, vLine] = mine && revealed ? verdict(t, poll, mine) : ['', ''];
  const letters = faceLabels(poll.options.map((o) => o.label));
  // 3 or more choices: one compact row per choice, like the real EVM ballot unit. Two choices keep the big photo cards.
  const ballot = poll.options.length >= 3;
  // The duel that Next will open (the same rule as goNext): named in the bar, so Next is an invitation, not a guess.
  const upNext = deck.length > 1 ? [...deck.keys()].map((k) => deck[(i + 1 + k) % deck.length]).find((p) => p.id !== poll.id && isOpen(p)) ?? null : null;

  return (
    <div className={'tot duel' + (revealed ? ' is-revealed' : '')} ref={topRef} style={{ viewTransitionName: 'ballot' } as React.CSSProperties}>

      <div className="tot-q">
        <h1 key={poll.id} className="display duel-q">{poll.title}</h1>
        <p className="small muted">
          {poll.closed ? t.pollingClosed : <><span className="live-dot" aria-hidden /> {t.pollingOpen}</>} · <span key={poll.participants} className="tick">{poll.participants.toLocaleString('en-IN')}</span> {t.votesCast(poll.participants)}
          {/* Time left depends on the clock, so the server's and the phone's text can differ by a minute: that is fine. */}
          {!poll.closed && poll.endsAt && <span suppressHydrationWarning>{` · ${t.closes(closesIn(t, poll.endsAt))}`}</span>}
          {!revealed && poll.pulse.lastHour > 0 && poll.pulse.lastHour < poll.participants && ` · ${t.inLastHour(poll.pulse.lastHour)}`}
          {poll.participants === 0 && !poll.closed && ` · ${t.beFirst}`}
          {fresh && fresh.id === poll.id && <span className="duel-fresh"> · {t.newVotes(fresh.n)}</span>}
        </p>
      </div>

      {poll.friend.known && !voted && (
        <p className="small duel-friend"><Users size={14} strokeWidth={1.75} aria-hidden /> {t.friendSealed}</p>
      )}

      <div className={'tot-options duel-options n-' + poll.options.length + (ballot ? ' is-ballot' : '') + (nudge && !voted ? ' is-nudge' : '')}>
        {poll.options.map((o, n) => {
          const isMine = poll.myVote === o.id;
          const lead = n === leaderIdx;
          return (
            <button
              key={o.id}
              type="button"
              className={'tot-option duel-option' + (isMine ? ' is-mine' : '') + (revealed && !isMine ? ' is-other' : '') + (busy === o.id ? ' is-busy' : '')}
              style={{ '--pc': `var(--p-${TONES[n % TONES.length]})`, '--dc': `var(--d-${TONES[n % TONES.length]})` } as React.CSSProperties}
              onClick={() => vote(o.id)}
              disabled={voted || !!busy || poll.closed}
              aria-label={`${o.label}${revealed ? `, ${t.percent(pcts[n])}` : ''}`}
            >
              <span className="tot-letter">{isMine ? <Check size={13} strokeWidth={2.5} aria-hidden /> : serial(n)}</span>
              {revealed && (lead || isMine) && (
                <span className="tot-caption">
                  {isMine ? t.yourPick : poll.closed && !counting ? t.won : t.leading}
                  {isMine && lead ? ` · ${poll.closed && !counting ? t.wonLower : t.leadingLower}` : ''}
                </span>
              )}
              <span className="duel-body">
                <Face o={o} tone={TONES[n % TONES.length]} letters={letters[n]} />
                <span className="duel-text">
                  {o.subtitle && <span className="label">{o.subtitle}</span>}
                  <span className="duel-name">{o.label}</span>
                </span>
              </span>
              {revealed && (
                <span className="duel-result">
                  <span className="duel-pct"><Tween value={pcts[n]} render={(v) => `${v}%`} /></span>
                  {/* The line at 50% is the majority mark, as on counting-day tallies. */}
                  <span className="meter duel-meter" aria-hidden><span style={{ width: `${pcts[n]}%` }} /></span>
                  <span className="small muted"><Tween value={votesOf(o)} render={(v) => t.votes(v)} /></span>
                </span>
              )}
              {!revealed && !poll.closed && (
                <span className="evm-row" aria-hidden>
                  <span className={'evm-led' + (isMine ? ' is-on' : '')} />
                  <span className="evm-btn">{isMine ? t.voted : t.vote}</span>
                </span>
              )}
              {justVoted === o.id && !counting && <Burst />}
            </button>
          );
        })}
      </div>

      {!voted && !poll.closed && (
        <p className="small muted duel-hint" data-hint>{t.ballotHint}</p>
      )}

      {sealed && (
        <p className="small duel-sealed" role="note"><Lock size={13} strokeWidth={1.75} aria-hidden /> {t.sealed(sealedWhen(poll.sealedUntil!, lang))}</p>
      )}

      {!casting && voted && mine && !poll.closed && (
        // The record of the ink moment (the moment itself plays in CastVote).
        <div className={'duel-inked' + (inkedFor === poll.id ? ' is-new' : '')}>
          <InkFinger size={56} />
          <p className="small">
            <strong>{t.inked}.</strong>
            {poll.myVoterNumber ? <span className="muted"> {t.voterId} EL-{String(poll.myVoterNumber).padStart(6, '0')}</span> : null}
          </p>
        </div>
      )}

      {!casting && voted && poll.needsGuess && (
        <div className="duel-guess" aria-live="polite" ref={guessRef}>
          <p className="label">{t.exitPoll}</p>
          <h2 tabIndex={-1}>{t.whoWinning}</h2>
          <p className="small muted">{t.exitPollNote}</p>
          {/* Each choice as a small card with its face (photo, emoji or letters): you recognise before you read. */}
          <div className={'duel-guess-options' + (poll.options.length > 4 ? ' is-many' : '')}>
            {poll.options.map((o, n) => (
              <button key={o.id} type="button" className="guess-card" disabled={guessBusy} onClick={() => guess(o.id)}
                style={{ '--pc': `var(--p-${TONES[n % TONES.length]})` } as React.CSSProperties}>
                <Face o={o} tone={TONES[n % TONES.length]} letters={letters[n]} />
                <span className="guess-name">{o.label}</span>
              </button>
            ))}
          </div>
          <p className="small muted">
            <button type="button" className="link-like duel-undo" onClick={() => guess('skip')} disabled={guessBusy}>{t.skipShow}</button>
            {undoUntil > 0 && <> · <button type="button" className="link-like duel-undo" onClick={undo}>{t.undoVote}</button></>}
          </p>
        </div>
      )}

      {revealed && poll.totalVotes > 0 && !counting && (
        <div className="duel-swing">
          {poll.trend.length > 2 && sparkOpt && <Sparkline points={poll.trend.map((p) => (sparkOpt.id === poll.options[0].id ? p.a : 100 - p.a))} label={sparkOpt.label} aria={t.shareOverTime} />}
          <p className="small muted">
            {poll.swing ? (
              <>
                <strong className="duel-swing-name">{t.swing24}</strong> {poll.options.find((o) => o.id === poll.swing!.optionId)?.label}{' '}
                <span className={poll.swing.points > 0 ? 'txt-good' : 'txt-bad'}>{poll.swing.points > 0 ? '▲' : '▼'} {Math.abs(poll.swing.points)} {t.pts}</span>
                {' · '}
              </>
            ) : poll.trend.length > 2 && sparkOpt ? (
              <>{t.shareOverTime(sparkOpt.label)} · </>
            ) : null}
            {t.majorityLine}
          </p>
        </div>
      )}

      {poll.options.some((o) => o.imageCredit) && (
        <p className="duel-credit">{t.photos}: {poll.options.filter((o) => o.imageCredit).map((o) => o.imageCredit).join(' · ')}</p>
      )}

      {msg && <p className="duel-error" role="alert">{msg}</p>}

      {/* The one next step, pinned at thumb height on phones. */}
      <div className={'tot-result' + (barOn ? ' is-shown' : '')} aria-live="polite">
        {revealed && counting && (
          <p className="duel-counting"><span className="live-dot" aria-hidden /> <span><strong>{t.counting}</strong> · {t.round(countRound! + 1)}: {ticker}</span></p>
        )}
        {barOn && !counting && (
          <>
            <p>
              {/* Sealed: the note under the cards already says why there are no numbers; the bar keeps Undo, Share and Next. */}
              {sealed && !revealed && undoUntil > 0 && !poll.closed && voted && (
                <button type="button" className="link-like duel-undo small muted" onClick={undo}>{t.undoVote}</button>
              )}
              {revealed && poll.closed && (
                <>
                  <strong>{t.declared}</strong>{' '}
                  {leaderIdx >= 0
                    ? t.winsBy(poll.options[leaderIdx].label, margin)
                    : poll.totalVotes
                      ? t.tie
                      : t.nobody}
                  {mine && <br />}
                </>
              )}
              {revealed && mine ? (
                <>
                  {poll.myGuess && (
                    <span className={'duel-guessed' + (justGuessed ? ' is-new' : '')}>
                      {poll.myGuess.correct ? (
                        <strong className="txt-good">{t.exitRight}</strong>
                      ) : (
                        <strong className="txt-bad">{t.exitWrong}</strong>
                      )}
                      {!poll.myGuess.correct && leaderIdx >= 0 && <> {t.isAhead(poll.options[leaderIdx].label)}</>}
                      <br />
                    </span>
                  )}
                  <strong>{vTitle}</strong> {vLine}
                  {poll.friend.optionId && (
                    <span className="duel-friend-line">
                      {' '}<Users size={13} strokeWidth={1.75} aria-hidden /> {t.friendPicked(poll.options.find((o) => o.id === poll.friend.optionId)?.label ?? '')}
                      {poll.friend.optionId === poll.myVote ? t.agree : t.disagree}
                    </span>
                  )}
                  {poll.friends.agree + poll.friends.disagree > 0 && (
                    <span className="small muted">
                      {' '}{t.dares(poll.friends.agree + poll.friends.disagree, poll.friends.agree, poll.friends.disagree)}
                    </span>
                  )}
                  {undoUntil > 0 && !poll.closed && (
                    <> <button type="button" className="link-like duel-undo small muted" onClick={undo}>{t.undoVote}</button></>
                  )}
                </>
              ) : (
null
              )}
            </p>
            {upNext && <span className="small muted duel-upnext">{t.upNext(upNext.title)}</span>}
            <span className="row">
              <button type="button" className="btn btn-ghost" onClick={() => (mine && poll.myShareCode ? setSharing(true) : share())}>
                <Share2 size={14} strokeWidth={1.75} aria-hidden /> {copied ? t.linkCopied : poll.closed ? t.shareResult : t.shareInk}
              </button>
              <button type="button" className="btn btn-primary" onClick={next} ref={nextRef}>
                {t.next} <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
              </button>
            </span>
          </>
        )}
      </div>

      {declaredBurst && <Burst count={24} />}

      {casting && castOpt && (
        <CastVote
          t={t}
          number={poll.options.findIndex((o) => o.id === casting.optionId) + 1}
          name={castOpt.label}
          party={castOpt.subtitle?.split(' · ')[0] ?? null}
          voterNo={poll.myVoterNumber}
          short={casting.short}
          onDone={() => castDone(casting.optionId, poll.needsGuess)}
        />
      )}

      {sharing && mine && poll.myShareCode && (
        <ShareSheet poll={poll} pick={mine} shareCode={poll.myShareCode} onClose={() => setSharing(false)} />
      )}

      {/* P3, optional: after the pinned bar, so the bar never covers it. */}
      {(revealed || sealed) && mine && (
        <div className="duel-after">
          {poll.endsAt && !poll.closed && (
            <p className="small">
              <a className="text-link" href={`/api/polls/${poll.id}/ics`} download>
                <CalendarPlus size={14} strokeWidth={1.75} aria-hidden /> {t.addCalendar}
              </a>
            </p>
          )}
          {poll.reasons.length > 0 && (
            <div className="duel-group">
              {poll.myReason || reasonSaved ? (
                <p className="small muted">{t.reasonThanks}{poll.myReason ? `: ${reasonLabel(t, poll.myReason)}` : ''}.</p>
              ) : (
                <>
                  <p className="label">{t.why(mine.label)}</p>
                  <div className="row wrap">
                    {poll.reasons.map((r) => (
                      <button key={r} type="button" className="chip" onClick={() => post('reason', { reason: r })}>{reasonLabel(t, r)}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {/* What everyone's reasons say (only once results are open): the reward for answering "why". */}
          {revealed && poll.options.some((o) => o.reasons.length > 0) && (
            <div className="duel-group duel-whys">
              {poll.options.filter((o) => o.reasons.length > 0).map((o) => {
                const sum = o.reasons.reduce((a, r) => a + r.n, 0);
                return (
                  <p key={o.id} className="small">
                    <span className="label">{t.whyPeople(o.label)}</span>
                    <span className="muted">{o.reasons.slice(0, 3).map((r) => `${reasonLabel(t, r.reason)} ${Math.round((r.n / sum) * 100)}%`).join(' · ')}</span>
                  </p>
                );
              })}
            </div>
          )}
          <div className="duel-group">
            <p className="label">{t.react}</p>
            <div className="row wrap" role="group" aria-label={t.react}>
              {poll.reactions.map((r) => {
                const on = poll.myReactions.includes(r.emoji);
                return (
                  <button key={r.emoji} type="button" className={'chip' + (on ? ' chip-on' : '')} aria-pressed={on} onClick={() => post('react', { emoji: r.emoji })}>
                    {r.emoji}{r.n > 0 && ` ${r.n}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ReportDuel pollId={poll.id} t={t} lang={lang} />
    </div>
  );
}
