'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, CalendarPlus, Check, Flag, Lock, PenLine, Plus, Repeat, Share2, Target, Trophy, Users } from 'lucide-react';
import { MAX_OTHER } from '@/lib/limits';
import { track } from '@/lib/track';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { PollOption, PollView } from '@/lib/polls';
import { announceVote } from '@/lib/useStats';
import Burst from './Burst';
import InkFinger from './InkFinger';
import CastVote from './CastVote';
// The share panel loads when it is opened (less code before the first vote works).
const ShareSheet = dynamic(() => import('./ShareSheet'), { ssr: false });
import InstallInvite from './InstallInvite';
import { evmBeep, keyClick, votePop } from '@/lib/sound';
import { ratingAverage, ratingEmoji } from '@/lib/rating';
import { humanToken, prepareHumanCheck } from '@/lib/turnstile-client';
import { sideEmoji, sideOf, type Side } from '@/lib/sides';
import { useLang, useT } from '@/lib/lang';
import { apiMsg, reasonLabel, type Dict, type Lang } from '@/lib/i18n';
import { faceLabels } from '@/lib/labels';
import { manageKeyFor } from './MyPolls';
import SuggestChoice from './SuggestChoice';
import ResultAlert from './ResultAlert';
import GroupWait from './GroupWait';
import { INDIA_TZ, dateLocale, monthStyle } from '@/lib/time';
import { sharesAddUp, wholePercents } from '@/lib/percent';

// Duels, played like patricka's "This or That": tap a card, see the result on the
// cards, then "Next duel". Results stay hidden until you vote.
// Ballot serial numbers, like the EVM and the VVPAT slip (1, 2, 3…). Keys A/B… still work too.
const LETTERS = 'ABCDEFGHIJ';
const serial = (n: number) => String(n + 1);
// Hindi written in Devanagari on an English page: tell screen readers, so it is read with Hindi rules.
const hindiText = (s: string) => (/[\u0900-\u097F]/.test(s) ? 'hi' : undefined);
// Where this vote came from, for the maker's counts (never kept with the vote): the tag on the shared link (?src=wa)
// when this is the poll the link opened, else Instagram's own browser, else "other".
function voteSource(pollId: string): string | undefined {
  try {
    const here = window.location.pathname === `/p/${pollId}`;
    const src = here ? new URLSearchParams(window.location.search).get('src') : null;
    if (src) return src;
    if (/Instagram/i.test(navigator.userAgent)) return 'ig';
  } catch {}
  return undefined;
}
const TONES = ['input', 'feedback', 'control', 'agents', 'output', 'trust'];

// The cast-vote moment is full length on your first vote of a visit, then shorter (a ritual, not a wait).
let votesThisVisit = 0;

/** Whole-number percentages that always add up to 100. */
function rounded(opts: PollOption[], total: number, counts?: Record<string, number>) {
  if (!total) return opts.map(() => 0);
  return wholePercents(counts ? opts.map((o) => ((counts[o.id] ?? 0) / total) * 100) : opts.map((o) => o.percent));
}

function verdict(t: Dict, poll: PollView, mine: PollOption): [string, string] {
  // Numbers only where a share of voters means something (pick one, pick several); words for rank and rating.
  const side = sideOf(poll, mine);
  const numbers = poll.kind === 'choice' || poll.kind === 'multi';
  if (side.kind === 'first') return t.firstVote;
  if (side.kind === 'neck') return t.neck;
  if (side.kind === 'crowd' && side.pct >= 100) return t.allAgree(mine.label);
  if (side.kind === 'crowd') return numbers ? t.crowdPct(side.pct, mine.label) : t.crowd(mine.label);
  if (side.kind === 'rare') return t.rare(side.oneIn);
  return numbers ? t.minorityPct(side.pct) : t.bold;
}

// Where you stood on one poll of today's set (null = you cannot see its result yet).
function daySide(p: PollView): Side | null {
  if (p.myVote === null || !p.resultsVisible || p.sealedUntil) return null;
  const picks = p.options.filter((o) => p.myPicks.includes(o.id));
  // Pick several: your best-placed tick, as in the result line.
  const mine = (p.kind === 'multi' ? picks.sort((a, b) => b.votes - a.votes)[0] : null) ?? p.options.find((o) => o.id === p.myVote);
  return mine ? sideOf(p, mine) : null;
}
function sideWords(t: Dict, side: Side | null, kind: PollView['kind']) {
  if (!side) return t.sideLater;
  if (side.kind === 'first') return t.sideFirst;
  if (side.kind === 'neck') return t.sideNeck;
  if (side.kind === 'rare') return t.sideRare(side.oneIn);
  // Rank and rating shares are not "people who picked this", so they get words, not a number.
  if (kind === 'rank' || kind === 'rating') return side.kind === 'crowd' ? t.sideCrowdWord : t.sideAgainst;
  return side.kind === 'crowd' ? t.sideCrowd(side.pct) : t.sideMinority(side.pct);
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

function Face({ o, tone, letters }: { o: PollOption; tone: string; letters: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const src = o.imageUrl ?? null;
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
  new Date(iso).toLocaleString(dateLocale(lang), { day: 'numeric', month: monthStyle(lang), hour: 'numeric', minute: '2-digit', timeZone: INDIA_TZ });

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
export default function DuelGame({ deck: initialDeck, start, via, todayId, daily = false, more: initialMore = [] }: {
  deck: PollView[];
  start?: number;
  via?: string | null;
  todayId?: string | null;
  /** Home: the deck is today's set (a few polls, the same for everyone), with "N left today" and an end card. */
  daily?: boolean;
  /** Home: the polls offered after today's set, only when you ask for more (never pushed). */
  more?: PollView[];
}) {
  const t = useT();
  const lang = useLang();
  const [deck, setDeck] = useState(initialDeck);
  const [more, setMore] = useState(initialMore);
  // Today's set never changes while you play, even after "More polls" adds to the deck.
  const [setIds] = useState(() => new Set(daily ? initialDeck.map((p) => p.id) : []));
  const setLeft = daily ? deck.filter((p) => setIds.has(p.id) && isOpen(p)).length : 0;
  // The site address for the day's share text (known only on the phone, after the page has loaded).
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
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
  // The quick ink stamp (everyday polls, after the first vote of a visit) on the card you just picked.
  const [stamped, setStamped] = useState<string | null>(null);
  // Swipe left on a result to go to the next poll (phones): where the finger went down.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [sharing, setSharing] = useState(false);
  // Which duel you just voted in (plays the ink animation once).
  const [inkedFor, setInkedFor] = useState<string | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const guessRef = useRef<HTMLDivElement>(null);
  // The "are you a person?" check (only when switched on) gets ready in the background.
  useEffect(() => prepareHumanCheck(), []);

  // A rating poll's steps are stored as "1"…"5"; on screen they are the words ("Love it"), in your language.
  const raw = deck[i];
  // "Other (write your own)" is stored as "Other"; on screen it is "Other" in your language, with a pen, and once you
  // voted for it, what you wrote ("Other (Yogi Adityanath)").
  const poll = useMemo(
    () =>
      raw && raw.kind === 'rating'
        ? { ...raw, options: raw.options.map((o, n) => ({ ...o, label: t.rateWords[n] ?? o.label })) }
        : raw && raw.options.some((o) => o.isOther)
          ? { ...raw, options: raw.options.map((o) => (o.isOther ? { ...o, emoji: o.emoji ?? '✍️', label: o.id === raw.myVote && raw.myOther ? t.otherMine(raw.myOther) : t.otherChoice } : o)) }
          : raw,
    [raw, t],
  );
  // The write-in box under the ballot, open on the poll whose "Other" you tapped.
  const [writing, setWriting] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  const rating = poll?.kind === 'rating';
  // "Pick several": tick choices first (kept here until you press Vote), then one vote carries them all.
  // "Which dates work?": like pick several, with three answers per date (works → if need be → doesn't work).
  const dates = poll?.kind === 'dates';
  const multi = poll?.kind === 'multi' || poll?.kind === 'rank' || dates;
  // Rank: the order you tap is your ranking (first tap = #1).
  const ranking = poll?.kind === 'rank';
  const [ticks, setTicks] = useState<string[]>([]);
  const [maybes, setMaybes] = useState<string[]>([]);
  useEffect(() => {
    setTicks([]);
    setMaybes([]);
  }, [raw?.id]);
  const toggleTick = (id: string) => {
    if (!dates) return setTicks((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
    // Dates: works → if need be → doesn't work → works…
    if (ticks.includes(id)) {
      setTicks((x) => x.filter((y) => y !== id));
      setMaybes((x) => [...x, id]);
    } else if (maybes.includes(id)) setMaybes((x) => x.filter((y) => y !== id));
    else setTicks((x) => [...x, id]);
  };
  // The friend's code only belongs to the duel they shared (the first one on a shared link).
  const viaHere = poll && start !== undefined && i === start ? via ?? null : null;
  const q = viaHere ? `?f=${encodeURIComponent(viaHere)}` : '';
  const voted = poll?.myVote != null;
  const revealed = !!poll && !casting && poll.resultsVisible && (voted || poll.closed);
  // Election silence window: no numbers for anyone, but the pinned bar still offers Share and Next.
  const sealed = !!poll?.sealedUntil;
  // Hidden results shown straight after the vote, with no crowd guess first: no undo (undoVote in polls.ts says the same).
  const seenAtOnce = poll?.hideUntilVoted && !poll?.sealedUntil && (poll?.calledIt || poll?.kind === 'dates' || (!!poll?.groupSize && !poll?.groupWaiting));
  // A sealed poll or a group poll still waiting: the bar keeps Share and Next even without numbers.
  const barOn = revealed || (!casting && (sealed || !!poll?.groupWaiting) && (voted || !!poll?.closed));
  const votedCount = deck.filter((p) => p.myVote !== null).length;
  // Counting day: when results open in front of you, they are counted in 3 rounds (real vote order), like TV on counting day.
  const [countRound, setCountRound] = useState<number | null>(null);
  const wasRevealed = useRef<{ id: string; on: boolean } | null>(null);
  // Runs on the duel and on "revealed" only: new data arriving mid-count (a reaction, a refresh) must not stop the
  // count halfway, which used to leave the bar stuck on "round 1 of 3" with no Next button.
  const countId = poll?.id;
  // Counting day (3 rounds) belongs to Election mode; other polls show the result straight away.
  const countRounds = poll?.electionMode ? poll.rounds.length : 0;
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
  // Pick several: each bar is the share of voters who ticked it (they add up to more than 100%).
  const pcts = useMemo(
    () => (poll ? (!sharesAddUp(poll.kind) ? poll.options.map((o) => Math.round(o.percent)) : rounded(poll.options, shownTotal, shown ?? undefined)) : []),
    [poll, shownTotal, shown],
  );
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
  const bestDate = (() => {
    if (!dates || !poll || !revealed || !poll.totalVotes) return -1;
    const score = (o: PollOption) => o.votes * 1000 + o.maybe;
    const best = Math.max(...poll.options.map(score));
    return poll.options.filter((o) => score(o) === best).length === 1 ? poll.options.findIndex((o) => score(o) === best) : -1;
  })();
  const leaderIdx = dates ? bestDate : revealed && poll && poll.totalVotes > 0 && pcts.filter((v) => v === top).length === 1 ? pcts.indexOf(top) : -1;
  // The race line follows the choice in the swing line (else the leader). Two-choice duels only (the trend is the first choice's share).
  const sparkOpt = poll ? poll.options.find((o) => o.id === poll.swing?.optionId) ?? (leaderIdx >= 0 ? poll.options[leaderIdx] : poll.options[0]) : null;
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

  const deckRef = useRef(deck);
  deckRef.current = deck;
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
  // "Called it": this phone made the poll (it holds the private key), so it can mark what happened.
  const [manageKey, setManageKey] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  useEffect(() => setManageKey(poll?.calledIt && !poll.outcome ? manageKeyFor(poll.id) : null), [poll?.id, poll?.calledIt, poll?.outcome]);
  async function markOutcome(o: PollOption) {
    if (!poll || !manageKey || marking || !window.confirm(t.calledMarkConfirm(o.label))) return;
    setMarking(true);
    const res = await fetch(`/api/polls/${poll.id}/outcome`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ optionId: o.id, key: manageKey }) }).catch(() => null);
    setMarking(false);
    if (res?.ok) return refresh();
    const data = await res?.json().catch(() => null);
    setMsg(data?.error ? apiMsg(lang, data.error) : t.saveFail2);
  }
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
  async function vote(optionId: string, picks: string[] = [], maybeList: string[] = [], other?: string) {
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
      body: JSON.stringify({ optionId, picks, maybes: maybeList, other, via: viaHere, human, src: voteSource(poll.id) }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.poll) {
      if (poll.electionMode) evmBeep();
      else votePop();
      setInkedFor(poll.id);
      replace(data.poll);
      setReasonSaved(false);
      announceVote(poll.id, 1);
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduce) castDone(optionId, data.poll.needsGuess);
      // Everyday polls: the full ink moment once per visit (the signature); after that a quick ink stamp on the card you
      // picked and the result straight away, so a set of polls flows. Election mode always keeps its booth.
      else if (!poll.electionMode && votesThisVisit > 0) {
        votesThisVisit++;
        setStamped(optionId);
        navigator.vibrate?.([8, 40, 8]);
        castDone(optionId, data.poll.needsGuess);
      } else setCasting({ optionId, short: votesThisVisit++ > 0 });
    } else if (!res && !navigator.onLine) {
      // No internet: keep the choice and send it by itself when the phone is back online.
      // The keys stay pressed (busy) until then, so a second tap cannot queue a second vote.
      setMsg(t.noNet);
      if (queued.current) window.removeEventListener('online', queued.current);
      const retry = () => {
        queued.current = null;
        setMsg('');
        setBusy(null);
        // The whole vote goes out (every tick and "if need be" date), not just the first choice.
        vote(optionId, picks, maybeList, other);
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
    // The very first vote in a hidden-results duel: no exit poll ("who's winning?" with one vote is no question).
    if (needsGuess && (deckRef.current.find((p) => p.id === poll?.id)?.participants ?? 0) <= 1) {
      guess('skip');
      needsGuess = false;
    }
    setJustVoted(needsGuess ? null : optionId);
    setUndoUntil(Date.now() + 20_000); // the server allows 30 s from the vote; the moment took up to 5 of them
    focusAfter.current = true;
  }
  // Keyboard and screen-reader users land on the next step once the screen has settled (after the count):
  // the exit poll question if it is asked, else Next.
  const focusAfter = useRef(false);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!focusAfter.current || casting || counting || !poll) return;
    const wantGuess = poll.needsGuess;
    // A moment later, and looked up again then: the bar slides in, and the count may still start and re-draw it.
    clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => {
      const target = wantGuess ? guessRef.current?.querySelector<HTMLElement>('h2') : nextRef.current;
      if (!target || !focusAfter.current) return;
      focusAfter.current = false;
      const now = document.activeElement;
      if (!now || now === document.body || (now as HTMLButtonElement).disabled || now.closest('.duel-options')) target.focus({ preventScroll: true });
    }, 450);
  });
  const [guessBusy, setGuessBusy] = useState(false);
  const [justGuessed, setJustGuessed] = useState(false);
  // The guess you just tapped, held for a short "checking the count…" beat before the reveal (the suspense is the fun).
  const [guessing, setGuessing] = useState<string | null>(null);
  async function guess(choice: string) {
    if (!poll || guessBusy) return;
    gen.current++;
    setGuessBusy(true);
    navigator.vibrate?.(10);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (choice !== 'skip') setGuessing(choice);
    const [res] = await Promise.all([
      fetch(`/api/polls/${poll.id}/guess${q}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      }).catch(() => null),
      // A short beat of suspense: long enough to feel, short enough not to wait (none for "skip" or Reduce motion).
      new Promise((r) => setTimeout(r, choice === 'skip' || reduce ? 0 : 700)),
    ]);
    setGuessing(null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.poll) {
      replace(data.poll);
      setJustGuessed(choice !== 'skip');
      // After the crowd guess you have seen the numbers, so undo is over (the first, lone voter excepted).
      if (data.poll.participants > 1) setUndoUntil(0);
      // Right: the confetti goes off on the choice you guessed (the one that leads), with a happy double buzz.
      if (data.poll.myGuess?.correct) {
        setJustVoted(choice);
        navigator.vibrate?.([10, 60, 10]);
      }
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
      // Keyboard and screen readers: back on the ballot, not at the top of the page.
      setTimeout(() => topRef.current?.querySelector<HTMLElement>('.duel-option:not(:disabled)')?.focus({ preventScroll: true }), 50);
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

  // A shared poll page (/p/<id>): after Next, the address (and Refresh, and the page's own header) follow the poll on
  // screen, so "Asked by …" never sits above someone else's poll.
  useEffect(() => {
    if (!poll || typeof window === 'undefined' || !window.location.pathname.startsWith('/p/')) return;
    if (window.location.pathname !== `/p/${poll.id}`) {
      history.replaceState(history.state, '', `/p/${poll.id}`);
      window.dispatchEvent(new CustomEvent('election:poll', { detail: poll.id }));
    }
  }, [poll?.id]);

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
    setStamped(null);
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
      if (!revealed && n >= 0 && n < poll.options.length) {
        if (poll.kind === 'multi' || poll.kind === 'dates') toggleTick(poll.options[n].id);
        else vote(poll.options[n].id);
      }
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

  if (over && daily) {
    // The end of today's set (P1): a clear stopping point that ends on a high, where you stood on each poll, and one
    // spoiler-free line to share (which side, never which choice). More polls only if you ask.
    const rows = deck.filter((p) => setIds.has(p.id)).map((p) => ({ p, side: daySide(p) }));
    const grid = rows.map((r) => sideEmoji(r.side)).join('');
    const text = `${t.dayShareText(grid)} ${origin}/`;
    const keepGoing = () => {
      const fresh = more.filter((m) => !deck.some((d) => d.id === m.id) && isOpen(m));
      if (!fresh.length) return;
      setDeck([...deck, ...fresh]);
      setMore([]);
      setI(deck.length);
      setOver(false);
    };
    return (
      <div className="tot tot-over day-end" ref={topRef}>
        <InkFinger size={64} />
        <h1 className="display duel-q">{t.setDone}</h1>
        <p className="tot-verdict">{t.setDoneNote}</p>
        <div className="day-vs">
          <p className="label">{t.dayVs}</p>
          <ul>
            {rows.map(({ p, side }, n) => (
              <li key={p.id} style={{ '--i': n } as React.CSSProperties}>
                <span aria-hidden>{sideEmoji(side)}</span>
                <Link href={`/p/${p.id}`} className="day-q">{p.title}</Link>
                <span className="small muted">{p.myVote === null && p.closed ? t.sideClosed : sideWords(t, side, p.kind)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="row wrap center">
          <a className="btn btn-primary btn-lg" href={`https://wa.me/?text=${encodeURIComponent(text.replace(link(), `${link()}${link().includes('?') ? '&' : '?'}src=wa`))}`} target="_blank" rel="noopener noreferrer" onClick={() => track('whatsapp')}>
            <Share2 size={15} strokeWidth={1.75} aria-hidden /> {t.shareDay}
          </a>
          {more.some((m) => isOpen(m) && !deck.some((d) => d.id === m.id)) ? (
            <button type="button" className="btn btn-ghost btn-lg" onClick={keepGoing}>{t.morePolls} <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></button>
          ) : (
            <Link href="/polls" className="btn btn-ghost btn-lg">{t.morePolls} <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></Link>
          )}
        </div>
        <p className="small"><Link href="/create" className="text-link"><Plus size={13} strokeWidth={1.75} aria-hidden /> {t.startOwn}</Link></p>
        <InstallInvite />
      </div>
    );
  }

  if (over) {
    return (
      <div className="tot tot-over" ref={topRef}>
        <InkFinger size={64} />
        <h1 className="display duel-q">{t.allDone}</h1>
        <p className="tot-verdict">{t.allDoneNote}</p>
        <div className="row wrap center">
          <Link href="/create" className="btn btn-primary btn-lg"><Plus size={15} strokeWidth={1.75} aria-hidden /> {t.startOwn}</Link>
          <Link href="/me" className="btn btn-ghost btn-lg">{t.seeYourVotes}</Link>
        </div>
      </div>
    );
  }

  // Pick several: judge by your best-placed tick (you are "with the crowd" if any tick leads).
  const verdictPick = multi ? poll.options.filter((o) => poll.myPicks.includes(o.id)).sort((a, b) => b.votes - a.votes)[0] ?? mine : mine;
  const [vTitle, vLine] = verdictPick && revealed ? verdict(t, poll, verdictPick) : ['', ''];
  // A rare take (1 in 5 or fewer) is the most surprising result: it gets a lime highlight (lime = you).
  const rareNow = !!verdictPick && revealed && (poll.kind === 'choice' || poll.kind === 'multi') && sideOf(poll, verdictPick).kind === 'rare';
  // Dates show their day of the month ("14") in the circle; other choices their letters.
  const letters = dates ? poll.options.map((o) => /\d{1,2}/.exec(o.label)?.[0] ?? '📅') : faceLabels(poll.options.map((o) => o.label));
  // 3 or more choices: one compact row per choice, like the real EVM ballot unit. Two choices keep the big photo cards.
  const ballot = poll.options.length >= 3;
  const happened = poll.calledIt ? poll.outcome : null;
  const happenedIdx = happened ? poll.options.findIndex((o) => o.id === happened) : -1;
  // The final result card (docs/DESIGN.md, "Final result first"): what won, by how much, and what you picked.
  // (A 1–5 faces poll already opens on its average, so it needs no second card.)
  const finalOn = poll.closed && revealed && !counting && !rating;
  const avg = rating ? ratingAverage(poll.options.map((o) => o.votes)) : null;
  const tied = leaderIdx < 0 && poll.totalVotes > 0 && !rating ? poll.options.filter((_, n) => pcts[n] === top).map((o) => o.label) : [];
  const winner = happenedIdx >= 0 ? poll.options[happenedIdx] : leaderIdx >= 0 ? poll.options[leaderIdx] : null;
  const finalHead =
    happenedIdx >= 0 ? t.finalHappened(poll.options[happenedIdx].label)
    : !poll.totalVotes ? t.nobody
    : rating && avg != null ? `${ratingEmoji(avg)} ${t.rateAvg(avg.toFixed(1))}`
    : dates && winner ? `${t.bestDate}: ${winner.label}`
    : winner ? `${winner.label}`
    : tied.length ? t.finalTie(tied.join(', '))
    : t.tie;
  const finalSub =
    happenedIdx >= 0 ? (mine ? (mine.id === happened ? t.calledRight(pcts[happenedIdx]) : t.calledWrong(pcts[happenedIdx])) : pcts[happenedIdx] ? t.calledPct(pcts[happenedIdx]) : t.calledNobody)
    : !poll.totalVotes ? ''
    : rating ? t.rateFrom(poll.participants)
    : dates && winner ? t.datesResult(winner.votes, winner.maybe)
    : ranking && winner ? t.finalRankSub(poll.participants)
    : winner ? t.finalShare(pcts[leaderIdx], poll.participants)
    : t.votes(poll.participants);
  // Your pick (the yellow "you" line); for "Called it" the line above already says how you did.
  const finalWon = !!mine && !!winner && happenedIdx < 0 && !rating && mine.id === winner.id;
  const finalYou = happenedIdx >= 0 || !mine || ranking || multi || dates ? '' : finalWon ? `${t.finalYouWon} · ${mine.emoji ? `${mine.emoji} ` : ''}${mine.label}` : t.finalYou(rating ? `${mine.emoji ?? ''} ${mine.label}`.trim() : mine.label);
  const numbered = poll.electionMode || ranking;
  // The duel that Next will open (the same rule as goNext): named in the bar, so Next is an invitation, not a guess.

  // The card under the result (P1 after voting): shown once the numbers are in and counting day has finished.
  const verdictOn = revealed && !!mine && !counting;
  return (
    <div
      className={'tot duel' + (revealed ? ' is-revealed' : '') + (poll.electionMode ? '' : ' is-light')}
      ref={topRef}
      style={{ viewTransitionName: 'ballot' } as React.CSSProperties}
      // Phones: once the result is in, a swipe to the left goes to the next poll (like a deck). Next stays the button.
      onTouchStart={(e) => {
        const el = e.target as HTMLElement;
        swipe.current = barOn && !counting && !el.closest('input, textarea, .row.wrap, .create-ideas, .topic-chips') ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
      }}
      onTouchEnd={(e) => {
        const from = swipe.current;
        swipe.current = null;
        if (!from || !barOn || counting || sharing) return;
        const dx = e.changedTouches[0].clientX - from.x;
        const dy = e.changedTouches[0].clientY - from.y;
        if (dx < -70 && Math.abs(dy) < Math.abs(dx) * 0.6) next();
      }}
    >

      <div className="tot-q">
        {/* The owner's pick for the top of Home (P2): says why this poll is first. */}
        {/* Today's set (P3): plain words, never dots or a stepper, and it starts again tomorrow (not a streak). */}
        {(todayId === poll.id || (daily && setIds.has(poll.id) && setLeft > 0)) && (
          <p className="label duel-today">
            {todayId === poll.id ? t.todaysQuestion : t.setLabel}
            {todayId === poll.id && poll.closed && ` · ${t.finalCount}`}
            {daily && setIds.has(poll.id) && setLeft > 0 && <span className="duel-set"> · {t.setLeft(setLeft)}</span>}
          </p>
        )}
        {/* "Called it" (P2): says this is about a real event, answered later. */}
        {poll.groupSize && !(todayId === poll.id) && <p className="label duel-today">👥 {t.grpLabel}</p>}
        {poll.calledIt && !poll.outcome && !(todayId === poll.id || (daily && setIds.has(poll.id) && setLeft > 0)) && <p className="label duel-today">🔮 {t.calledLabel}</p>}
        <h1 key={poll.id} className="display duel-q" lang={hindiText(poll.title)}>{poll.title}</h1>
        {/* The creator's "Details" line (and a pack's "Fan poll, not the official vote"). */}
        {poll.description && <p className="small muted duel-desc">{poll.description}</p>}
        <p className="small muted">
          {poll.closed ? t.pollingClosed : <><span className="live-dot" aria-hidden /> {t.pollingOpen}</>}
          {/* No votes yet: "be the first" says it (not "0 votes cast · be the first"). */}
          {poll.participants === 0 && !poll.closed ? ` · ${t.beFirst}` : <> · <span key={poll.participants} className="tick">{poll.participants.toLocaleString('en-IN')}</span> {t.votesCast(poll.participants)}</>}
          {/* Time left depends on the clock, so the server's and the phone's text can differ by a minute: that is fine. */}
          {!poll.closed && poll.endsAt && <span suppressHydrationWarning>{` · ${t.closes(closesIn(t, poll.endsAt))}`}</span>}
          {!revealed && poll.pulse.lastHour > 0 && poll.pulse.lastHour < poll.participants && ` · ${t.inLastHour(poll.pulse.lastHour)}`}
          {fresh && fresh.id === poll.id && <span className="duel-fresh"> · {t.newVotes(fresh.n)}</span>}
        </p>
      </div>

      {/* An ended poll opens on its result (P1 of an ended poll): the answer first, then the details below. */}
      {finalOn && (
        <section className={'final-card' + (poll.electionMode ? ' is-election' : '')} aria-labelledby="final-head">
          <p className="label final-eyebrow"><Trophy size={14} strokeWidth={2} aria-hidden /> {poll.electionMode ? t.declaredTitle : t.finalTitle}</p>
          <p className="final-head" id="final-head" lang={hindiText(finalHead)}>{finalHead}</p>
          {finalSub && <p className="small muted final-sub">{finalSub}</p>}
          {finalYou && <p className={'final-you' + (finalWon ? ' is-won' : '')}>{finalWon && <Check size={14} strokeWidth={2.5} aria-hidden />} {finalYou}</p>}
        </section>
      )}

      {poll.friend.known && !voted && (
        <p className="small duel-friend"><Users size={14} strokeWidth={1.75} aria-hidden /> {t.friendSealed}</p>
      )}

      {rating ? (
        // Rate it: five faces in a row. Before voting, tap one; after, the average and how many picked each face.
        revealed ? (
          <div className="rate-result" aria-live="polite">
            <p className="rate-avg">
              <span className="rate-face" aria-hidden>{ratingEmoji(ratingAverage(poll.options.map((o) => votesOf(o))) ?? 3)}</span>
              <span>
                <strong className="duel-pct"><Tween value={Math.round((ratingAverage(poll.options.map((o) => votesOf(o))) ?? 0) * 10)} render={(v) => t.rateAvg((v / 10).toFixed(1))} /></strong>
                <span className="small muted">{t.rateFrom(shownTotal)}{mine ? ` · ${t.rateMine(`${mine.emoji} ${mine.label}`)}` : ''}</span>
              </span>
            </p>
            <div className="rate-bars">
              {poll.options.map((o, n) => (
                <div key={o.id} className={'rate-bar' + (poll.myVote === o.id ? ' is-mine' : '')}>
                  <span className="rate-bar-face" aria-hidden>{o.emoji}</span>
                  <span className="meter" aria-hidden><span style={{ width: `${pcts[n]}%` }} /></span>
                  <span className="small rate-bar-pct">{pcts[n]}%</span>
                  <span className="sr-only">{o.label}: {t.percent(pcts[n])}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={'rate-scale' + (nudge && !voted ? ' is-nudge' : '')} role="group" aria-label={poll.title}>
            {poll.options.map((o) => (
              <button
                key={o.id}
                type="button"
                className={'rate-step' + (poll.myVote === o.id ? ' is-mine' : '') + (busy === o.id ? ' is-busy' : '')}
                onClick={() => vote(o.id)}
                disabled={voted || !!busy || poll.closed || !!poll.pausedUntil}
                aria-pressed={poll.myVote === o.id}
              >
                <span className="rate-step-face" aria-hidden>{o.emoji}</span>
                <span className="rate-step-word">{o.label}</span>
              </button>
            ))}
          </div>
        )
      ) : (
      <div className={'tot-options duel-options n-' + poll.options.length + (ballot ? ' is-ballot' : '') + (numbered ? '' : ' no-num') + (poll.electionMode ? ' is-election' : '') + (nudge && !voted ? ' is-nudge' : '')}>
          {poll.options.map((o, n) => {
            const isMine = multi ? poll.myPicks.includes(o.id) : poll.myVote === o.id;
            const ticked = multi && !voted && ticks.includes(o.id);
            const maybe = dates && (voted ? poll.myMaybes.includes(o.id) : maybes.includes(o.id));
            const lead = n === leaderIdx;
            return (
              <button
                key={o.id}
                type="button"
                className={'tot-option duel-option' + (isMine ? ' is-mine' : ticked ? ' is-ticked' : '') + (maybe ? ' is-maybe' : '') + (revealed && !isMine ? ' is-other' : '') + (revealed && lead ? ' is-lead' : '') + (busy === o.id ? ' is-busy' : '')}
                // --i: the order the result builds in (your pick first, then the rest), so the eye lands on you.
                style={{ '--pc': `var(--p-${TONES[n % TONES.length]})`, '--dc': `var(--d-${TONES[n % TONES.length]})`, '--i': isMine ? 0 : n + 1 } as React.CSSProperties}
                onClick={() => (multi ? toggleTick(o.id) : o.isOther ? setWriting(poll.id) : vote(o.id))}
                disabled={voted || !!busy || poll.closed || !!poll.pausedUntil}
                aria-pressed={multi && !voted && !dates ? ticked : undefined}
                aria-label={dates && !voted ? `${o.label}: ${ticked ? t.datesWorks : maybe ? t.datesMaybe : t.datesNo}` : `${voted || multi || revealed ? o.label : t.voteFor(o.label)}${revealed ? `, ${t.percent(pcts[n])}` : ''}`}
              >
                {/* Serial numbers belong to the EVM (Election mode); a Rank poll shows your order. Elsewhere they add nothing. */}
                {numbered && !(ranking && !ticked && !isMine) && (
                  <span className="tot-letter">
                    {ranking && (ticked || isMine) ? `#${(voted ? poll.myPicks : ticks).indexOf(o.id) + 1}` : isMine || ticked ? <Check size={13} strokeWidth={2.5} aria-hidden /> : serial(n)}
                  </span>
                )}
                {revealed && (lead || (isMine && !ranking) || poll.friend.optionId === o.id || happened === o.id) && (
                  <span className="tot-caption">
                    {/* "Called it": what happened is the answer; the most-picked choice is only "most called". */}
                    {isMine && !ranking && !dates ? t.yourPick : dates && lead ? t.bestDate : happened === o.id ? `✓ ${t.calledHappened}` : lead ? (poll.calledIt ? t.calledCrowd : poll.closed && !counting ? t.won : t.leading) : t.friendsPick}
                    {isMine && happened === o.id ? ` · ✓ ${t.calledHappened}` : isMine && !ranking && !dates && lead && !poll.calledIt ? ` · ${poll.closed && !counting ? t.wonLower : t.leadingLower}` : ''}
                    {poll.friend.optionId === o.id && (isMine || lead) ? ` · ${t.friendsPickLower}` : ''}
                  </span>
                )}
                <span className="duel-body">
                  <Face o={o} tone={TONES[n % TONES.length]} letters={letters[n]} />
                  <span className="duel-text">
                    {o.subtitle && <span className="label">{o.subtitle}</span>}
                    <span className="duel-name" lang={hindiText(o.label)}>{o.label}</span>
                    {/* "Other": the names written most often (by 2+ people), once the results show. */}
                    {o.isOther && revealed && poll.otherTop.length > 0 && (
                      <span className="small muted other-top">{t.otherMost(poll.otherTop.map((x) => `${x.name} (${x.n})`).join(', '))}</span>
                    )}
                  </span>
                </span>
                {revealed && (
                  <span className="duel-result">
                    <span className="duel-pct"><Tween value={pcts[n]} render={(v) => `${v}%`} /></span>
                    <span className="small muted">{ranking ? (o.avgPlace != null ? t.rankAvg(o.avgPlace.toFixed(1)) : '') : dates ? t.datesResult(o.votes, o.maybe) : <Tween value={votesOf(o)} render={(v) => t.votes(v)} />}</span>
                    {/* Your crowd guess, drawn on the real result: you see at once how close you were. */}
                    {poll.myGuess?.optionId === o.id && <span className="guess-tag"><Target size={12} strokeWidth={2} aria-hidden /> {t.yourGuess}</span>}
                  </span>
                )}
                {!revealed && !poll.closed && (
                  <span className="evm-row" aria-hidden>
                    <span className={'evm-led' + (isMine || ticked ? ' is-on' : '')} />
                    <span className="evm-btn">{dates && !voted ? (ticked ? t.datesWorks : maybe ? t.datesMaybe : ticks.length + maybes.length ? t.datesNo : t.datesTap) : multi && !voted ? (ranking ? (ticked ? t.rankRemove : t.rankNext(ticks.length + 1)) : ticked ? t.multiTicked : t.multiTick) : isMine ? t.voted : t.vote}</span>
                  </span>
                )}
                {justVoted === o.id && !counting && <Burst />}
                {stamped === o.id && <span className="ink-stamp" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}

      {/* "Other (write your own)": the name box, right under the ballot, once you tap Other. One main button: Vote. */}
      {writing === poll.id && !voted && !poll.closed && (
        <form
          className="other-write"
          onSubmit={(e) => {
            e.preventDefault();
            const other = poll.options.find((o) => o.isOther);
            if (other && otherText.trim()) vote(other.id, [], [], otherText.trim());
          }}
        >
          <label htmlFor="other-name" className="label">{t.otherAsk}</label>
          <span className="row">
            <span className="search">
              <PenLine size={14} strokeWidth={1.75} aria-hidden />
              <input id="other-name" autoFocus value={otherText} maxLength={MAX_OTHER} placeholder={t.otherPh} enterKeyHint="send" autoComplete="off" onChange={(e) => setOtherText(e.target.value)} />
            </span>
            <button type="submit" className="btn btn-primary" disabled={!otherText.trim() || !!busy}>{t.vote}</button>
          </span>
        </form>
      )}

      {/* A group poll waiting for its group (P1 while waiting): how many have voted, and remind them. */}
      {poll.groupWaiting && poll.groupSize && !casting && (
        <GroupWait pollId={poll.id} title={poll.title} voted={poll.participants} of={poll.groupSize} mine={voted} />
      )}


      {/* Pick several: the one main step is the Vote button under the ticks; it says how many you picked. */}
      {multi && !voted && !poll.closed && (
        <div className="multi-cast">
          {/* Rank: your order written out as it builds, so you can check it before you vote. */}
          {ranking && ticks.length > 0 ? (
            <p className="small rank-order">
              <strong>{t.rankYourOrder}</strong>{' '}
              {ticks.map((id, k) => `${k + 1}. ${poll.options.find((o) => o.id === id)?.label ?? ''}`).join(' · ')}
            </p>
          ) : (
            <p className="small muted">{ranking ? t.rankHint : dates ? t.datesHint : t.multiHint}</p>
          )}
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={(ranking ? ticks.length !== poll.options.length : dates ? !ticks.length && !maybes.length : !ticks.length) || !!busy || !!poll.pausedUntil}
            onClick={() => (dates ? vote([...ticks, ...maybes][0], ticks.slice(ticks.length ? 1 : 0), maybes) : vote(ticks[0], ticks.slice(1)))}
          >
            {ranking ? t.rankCast(ticks.length, poll.options.length) : dates ? t.datesCast : t.multiCast(ticks.length)}
          </button>
          {ranking && ticks.length > 0 && <button type="button" className="link-like small muted" onClick={() => setTicks([])}>{t.rankClear}</button>}
        </div>
      )}
      {multi && revealed && <p className="small muted">{ranking ? t.rankNote : dates ? t.datesNote : t.multiNote}</p>}

      {!voted && !poll.closed && (
        <p className="small muted duel-hint" data-hint>{t.ballotHint}</p>
      )}

      {/* The creator's one job on a "Called it" poll (P1 for them): mark what happened. */}
      {manageKey && !poll.outcome && (
        <div className="duel-group called-mark">
          <p className="label">🔮 {t.calledMarkTitle}</p>
          <div className="row wrap">
            {poll.options.map((o) => (
              <button key={o.id} type="button" className="chip" disabled={marking} onClick={() => markOutcome(o)}>{o.emoji ? `${o.emoji} ` : ''}{o.label}</button>
            ))}
          </div>
          <p className="small muted">{t.calledMarkNote}</p>
        </div>
      )}

      {poll.pausedUntil && !voted && !poll.closed && (
        <p className="small duel-sealed" role="note"><Lock size={13} strokeWidth={1.75} aria-hidden /> {t.paused}</p>
      )}

      {sealed && (
        <p className="small duel-sealed" role="note"><Lock size={13} strokeWidth={1.75} aria-hidden /> {t.sealed(sealedWhen(poll.sealedUntil!, lang))}</p>
      )}

      {verdictOn && (
        // P1 after voting, right under the result (owner, Oct 2026: "too much information, no hierarchy"): one card says
        // where you stand, once. It holds what the floating bar used to say (guess, friend, verdict) and the ink record.
        <div className={'duel-verdict' + (inkedFor === poll.id ? ' is-new' : '')} aria-live="polite">
          {!poll.closed && <InkFinger size={32} />}
          <div className="duel-verdict__text">
            {poll.myGuess && (
              <p className={'duel-guessed' + (justGuessed ? ' is-new' : '')}>
                {poll.myGuess.correct ? <strong className="txt-good">{t.exitRight}</strong> : <strong className="txt-bad">{t.exitWrong}</strong>}
                {!poll.myGuess.correct && leaderIdx >= 0 && <> {t.isAhead(poll.options[leaderIdx].label)}</>}
              </p>
            )}
            {/* Came from a friend's link: agree or disagree with them is the headline of this moment. */}
            {poll.friend.optionId && (
              <p className={'duel-friend-line' + (poll.friend.optionId === poll.myVote ? ' is-agree' : '')}>
                <Users size={14} strokeWidth={1.75} aria-hidden />{' '}
                <strong>{poll.friend.optionId === poll.myVote ? t.friendAgree : t.friendDisagree}</strong>{' '}
                {t.friendTheyPicked(poll.options.find((o) => o.id === poll.friend.optionId)?.label ?? '')}
              </p>
            )}
            {happenedIdx < 0 && !poll.closed && <p><strong className={rareNow ? 'is-rare' : undefined}>{vTitle}</strong> {vLine}</p>}
            {poll.friends.agree + poll.friends.disagree > 0 && <p className="small muted">{t.dares(poll.friends.agree + poll.friends.disagree, poll.friends.agree, poll.friends.disagree)}</p>}
            {!poll.closed && (
              <p className="small muted">
                {t.inked}.
                {poll.electionMode && poll.myVoterNumber ? <> {t.voterId} EL-{String(poll.myVoterNumber).padStart(6, '0')}</> : null}
                {undoUntil > 0 && !seenAtOnce && <> · <button type="button" className="link-like duel-undo" onClick={undo}>{t.undoVote}</button></>}
              </p>
            )}
          </div>
        </div>
      )}

      {!casting && voted && mine && !poll.closed && !verdictOn && (
        // The record of the ink moment (the moment itself plays in CastVote).
        <div className={'duel-inked' + (inkedFor === poll.id ? ' is-new' : '')}>
          <InkFinger size={32} />
          <p className="small">
            <strong>{t.inked}.</strong>
            {poll.electionMode && poll.myVoterNumber ? <span className="muted"> {t.voterId} EL-{String(poll.myVoterNumber).padStart(6, '0')}</span> : null}
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
              <button key={o.id} type="button" className={'guess-card' + (guessing === o.id ? ' is-guessed' : guessing ? ' is-dim' : '')} disabled={guessBusy} onClick={() => guess(o.id)}
                aria-pressed={guessing === o.id}
                style={{ '--pc': `var(--p-${TONES[n % TONES.length]})` } as React.CSSProperties}>
                <Face o={o} tone={TONES[n % TONES.length]} letters={letters[n]} />
                <span className="guess-name">{o.label}</span>
              </button>
            ))}
          </div>
          {guessing && <p className="small guess-checking" role="status"><span className="live-dot" aria-hidden /> {t.guessChecking}</p>}
          <p className="small muted">
            <button type="button" className="link-like duel-undo" onClick={() => guess('skip')} disabled={guessBusy}>{t.skipShow}</button>
            {undoUntil > 0 && <> · <button type="button" className="link-like duel-undo" onClick={undo}>{t.undoVote}</button></>}
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
            {/* Only the two next steps (owner, Oct 2026): what the bar used to say is in the card under the result. */}
            <p>
              {/* Sealed: the note under the cards already says why there are no numbers; the bar keeps Undo, Share and Next. */}
              {sealed && !revealed && undoUntil > 0 && !poll.closed && voted && (
                <button type="button" className="link-like duel-undo small muted" onClick={undo}>{t.undoVote}</button>
              )}
            </p>
            <span className="row duel-actions">
              {/* A group poll still waiting: "Remind the group" (above) is the one share action. */}
              {!poll.groupWaiting && <button type="button" className="btn btn-ghost" onClick={() => (mine && poll.myShareCode ? setSharing(true) : share())}>
                <Share2 size={14} strokeWidth={1.75} aria-hidden /> {copied ? t.linkCopied : poll.closed ? t.shareResult : t.shareInk}
              </button>}
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
          light={!poll.electionMode}
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
      {(revealed || sealed || poll.groupWaiting) && mine && (
        <div className="duel-after">
          {/* P2, first after the result (owner, Oct 2026, from the product audit): the voter → maker step. Someone who
              just answered a friend's question is asked, once and gently, for a question of their own. */}
          {revealed && (
            <ul className="al-listcard own-question">
              <li>
                <Link href="/create" className="al-row" onClick={() => track('create_after_vote')}>
                  <span className="al-row__disc" style={{ '--tone': 'var(--lime-badge)' } as React.CSSProperties} aria-hidden><Plus size={20} strokeWidth={1.75} /></span>
                  <span className="al-row__main">
                    <span className="al-row__title">{t.ownQuestion}</span>
                    <span className="al-row__meta">{t.startOwnLine}</span>
                  </span>
                  <ArrowRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
                </Link>
              </li>
            </ul>
          )}
          {/* P2: your group (you + friends from your link) vs everyone, for your pick. Lime = you. */}
          {revealed && poll.group && (
            <div className="duel-group group-vs">
              <p className="label">{t.groupTitle(mine.label)}</p>
              {[
                { name: t.groupMine(poll.group.size), pct: poll.group.mine, you: true },
                { name: t.groupAll, pct: poll.group.everyone, you: false },
              ].map((r) => (
                <div key={r.name} className={'group-row' + (r.you ? ' is-you' : '')}>
                  <span className="small"><strong>{r.name}</strong><span>{r.pct}%</span></span>
                  <span className="group-bar" aria-hidden><span style={{ width: `${r.pct}%` }} /></span>
                </div>
              ))}
              <p className="small muted">{t.groupNote}</p>
            </div>
          )}
          {/* P2 when the result comes later: one alert when it is in (an end time, or a "Called it" waiting for its answer). */}
          {!poll.closed && (poll.endsAt || (poll.calledIt && !poll.outcome) || poll.groupWaiting) && <ResultAlert pollId={poll.id} />}
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
          {/* P3: everything else, folded into one row so the page stays calm: the trend, last time, everyone's reasons,
              suggest a choice, report. */}
          <details className="duel-more">
            <summary>{t.pollMore}</summary>
            <div className="duel-more__body">
        {/* The trend under the result, only when there is one (a swing, or the share over time). The "line on each bar =
            majority" note and mark belong to Election mode's counting-day look; elsewhere they were noise. */}
        {revealed && poll.totalVotes > 0 && !counting && (poll.swing || (poll.trend.length > 2 && sparkOpt)) && (
          <div className="duel-swing">
            {poll.trend.length > 2 && sparkOpt && <Sparkline points={poll.trend.map((p) => (sparkOpt.id === poll.options[0].id ? p.a : 100 - p.a))} label={sparkOpt.label} aria={t.shareOverTime} />}
            <p className="small muted">
              {[
                poll.swing ? (
                  <span key="s">
                    <strong className="duel-swing-name">{t.swing24}</strong> {poll.options.find((o) => o.id === poll.swing!.optionId)?.label}{' '}
                    <span className={poll.swing.points > 0 ? 'txt-good' : 'txt-bad'}>{poll.swing.points > 0 ? '▲' : '▼'} {Math.abs(poll.swing.points)}{t.pts}</span>
                  </span>
                ) : poll.trend.length > 2 && sparkOpt ? (
                  <span key="t">{t.shareOverTime(sparkOpt.label)}</span>
                ) : null,
              ]
                .filter(Boolean)
                .flatMap((x, n) => (n ? [' · ', x] : [x]))}
            </p>
          </div>
        )}
              {/* "Ask again": how the same question went last time (only as far as anyone may see it). */}
              {revealed && poll.previous && (
                <p className="small muted prev-line">
                  <Repeat size={14} strokeWidth={2} aria-hidden /> {poll.previous.leader && poll.previous.percent != null ? t.lastTime(poll.previous.leader, poll.previous.percent, poll.previous.voters) : t.lastTimeHidden(poll.previous.voters)}
                </p>
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
              {poll.suggestionsOn && !counting && <SuggestChoice pollId={poll.id} />}
              <ReportDuel pollId={poll.id} t={t} lang={lang} />
            </div>
          </details>
        </div>
      )}

      {/* Before voting (or without a pick) Report stays at the bottom; after, it is under "More about this poll". */}
      {/* On Home (the daily set) Report is on the poll's own page instead; after voting it is under "More". */}
      {!daily && !((revealed || sealed || poll.groupWaiting) && mine) && <ReportDuel pollId={poll.id} t={t} lang={lang} />}
    </div>
  );
}
