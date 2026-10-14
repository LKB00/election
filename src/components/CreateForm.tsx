'use client';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AlignLeft, ArrowLeft, CalendarDays, Check, ChevronDown, ChevronRight, CircleDot, Clock, Eye, EyeOff, ImagePlus, Landmark, Lightbulb, ListChecks, ListOrdered, MessageSquarePlus, Mic, PenLine, Flame, Repeat, Shuffle, SlidersHorizontal, Smile, Sparkles, Timer, UserRound, Users, WandSparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, FIRST_TOPICS, TOPIC_EMOJI, type Category } from '@/lib/categories';
import { useLang, useT } from '@/lib/lang';
import { apiMsg } from '@/lib/i18n';
import { choicesFromQuestion, emojiFor } from '@/lib/createHelp';
import { namesPolitics } from '@/lib/moderation';
import { RATING_EMOJIS, RATING_LABELS, type PollKind } from '@/lib/rating';
import { rememberMyPoll } from './MyPolls';
import type { Picture } from './PicturePicker';
import PreviewCard, { previewRules, type PreviewPoll } from './PreviewCard';
import { dateLocale, monthStyle } from '@/lib/time';
import { sameKey } from '@/lib/same';
import { REVEAL_IN, START_MAX_DAYS, GROUP_DEFAULT_DAYS, MAX_CHOICE, MAX_CHOICES, MAX_DETAILS, MAX_GROUP, MAX_TITLE, MIN_CHOICES, MIN_TITLE } from '@/lib/limits';
// Loaded only when opened (less code for cheap phones to download before the form works).
/** "Hot take": the faces for Agree / Depends / Disagree (the words come from i18n, in the maker's language). */
const HOT_EMOJIS = ['🔥', '🤔', '🙅'];
const SignInSheet = dynamic(() => import('./SignIn'), { ssr: false });
const PicturePicker = dynamic(() => import('./PicturePicker'), { ssr: false });
const CreatePreview = dynamic(() => import('./CreatePreview'), { ssr: false });

// One settings row, two kinds only (owner, Oct 2026: "Settings, no consistency"): a switch row (icon disc, name, one
// short line, the switch) or a row that opens (icon disc, name, the current value when there is one, a chevron). The
// row keeps its look when open; what opens sits in one panel shape underneath.
// Picking an option inside an open row keeps the row open (owner, Oct 2026: closing on every tap felt jumpy), and keeps
// the option you tapped under your finger: a new poll type changes the choices above, which would shift the page.
const steady = (el: HTMLElement, change: () => void) => {
  const before = el.getBoundingClientRect().top;
  change();
  requestAnimationFrame(() => {
    const moved = el.getBoundingClientRect().top - before;
    if (moved) window.scrollBy({ top: moved, behavior: 'instant' });
  });
};
const Row = ({ icon: Icon, name, note, value, on, open: isOpen, onClick, tone = 'var(--sand)' }: { icon: typeof Clock; name: string; note?: string; value?: string; on?: boolean; open?: boolean; onClick: () => void; tone?: string }) => (
  <button type="button" className="al-row create-row" onClick={onClick} {...(on === undefined ? { 'aria-expanded': !!isOpen } : { role: 'switch', 'aria-checked': on })}>
    <span className="al-row__disc" style={{ '--tone': on ? 'var(--lime)' : tone } as React.CSSProperties} aria-hidden><Icon size={18} strokeWidth={1.75} /></span>
    <span className="al-row__main">
      <span className="al-row__title">{name}</span>
      {note && <span className="al-row__meta">{note}</span>}
      {/* The current value under the name, not beside it: "Right after voting" squeezed the name on small phones. */}
      {on === undefined && value && <span className="al-row__meta create-row__value" suppressHydrationWarning>{value}</span>}
    </span>
    {on === undefined ? (
      <>
        <ChevronDown size={18} strokeWidth={1.75} className={'create-row__chev' + (isOpen ? ' is-open' : '')} aria-hidden />
      </>
    ) : (
      <span className={'switch' + (on ? ' is-on' : '')} aria-hidden><span /></span>
    )}
  </button>
);

/** "Ask again": the earlier poll's question, choices and type, filled in (the new poll links back to it). */
export type AskAgain = { id: string; title: string; options: string[]; emojis: string[]; kind: PollKind; calledIt: boolean; category: string; showMaker: boolean };

export default function CreateForm({ initialTitle = '', initialTopic, signedIn = false, again, askBack = false }: { initialTitle?: string; initialTopic?: string; signedIn?: boolean; again?: AskAgain; /** Came from "Ask them back" after voting on a friend's poll. */ askBack?: boolean }) {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const [signed, setSigned] = useState(signedIn);
  const [ask, setAsk] = useState(false);
  const [title, setTitle] = useState(again?.title ?? initialTitle);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(again?.category ?? initialTopic ?? 'general');
  const startChoices = again && again.kind !== 'rating' && again.kind !== 'dates' ? [...again.options, ...(again.options.length < MAX_CHOICES ? [''] : [])] : ['', ''];
  const [choices, setChoices] = useState(startChoices);
  // One optional emoji per choice, kept in step with the choices.
  const [emojis, setEmojis] = useState(startChoices.map((_, n) => again?.emojis[n] ?? ''));
  // One optional photo per choice (a small JPEG made on the phone); a photo shows instead of the emoji.
  const [photos, setPhotos] = useState(startChoices.map(() => ''));
  // "Which dates work?": the dates as the phone's date picker gives them (2026-10-12), growing like the choices.
  const [dateVals, setDateVals] = useState(['', '']);
  const setDate = (i: number, v: string) => setDateVals((d) => [...d.map((x, j) => (j === i ? v : x)), ...(i === d.length - 1 && v && d.length < MAX_CHOICES ? [''] : [])]);
  // Dates are saved in one form for every voter ("Sat, 7 Nov"), whatever language the maker uses (the share picture can
  // only draw Latin letters).
  const dateLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const filledDates = [...new Set(dateVals.filter(Boolean))].sort();
  // Fairer, and more ways in: each voter's own order, and "suggest a choice" (the maker adds it first).
  const [shuffle, setShuffle] = useState(false);
  const [suggestionsOn, setSuggestionsOn] = useState(true);
  // The maker's name on the poll: their choice, off unless they turn it on.
  const [showMaker, setShowMaker] = useState(again?.showMaker ?? false);
  // With your name on: also show your own pick to voters once they have voted (your choice; never on politics).
  const [makerPick, setMakerPick] = useState(true);
  // "Other (write your own)" at the end of the ballot. Until you touch it, it follows the topic: on for politics (a
  // two-name ballot leaves out everyone else; also when the question or choices name a politician or party), off
  // otherwise.
  const [otherSet, setOtherSet] = useState<boolean | null>(null);
  const otherOn = otherSet ?? (category === 'politics' || namesPolitics(title, ...choices));
  // Which choice's picture sheet is open.
  const [picking, setPicking] = useState<number | null>(null);
  // Only what the person picked (owner: nothing shown before you choose); the fitting emoji is offered first in the picker.
  const emojiAt = (i: number) => emojis[i] ?? '';
  const [endsAt, setEndsAt] = useState('');
  // "Post later": opens for votes at this time (phone's local time, like the end time).
  const [startsAt, setStartsAt] = useState('');
  const [hideUntilVoted, setHide] = useState(true); // on by default: guess first, then see (the guess game)
  // "Show results": right after voting (default), or at a set time for everyone at once (a reason to come back).
  const [revealIn, setRevealIn] = useState<(typeof REVEAL_IN)[number]>('now');
  const [allowChange, setChange] = useState(false);
  // A group poll: results open for everyone once this many have voted (typed as text; empty = not a group poll).
  const [groupSize, setGroupSize] = useState('');
  const groupN = Number.parseInt(groupSize, 10);
  const isGroup = Number.isFinite(groupN) && groupN >= 2 && groupN <= MAX_GROUP;
  // Election mode: the full booth ritual for this poll. Politics polls get it anyway (the server decides that).
  const [electionMode, setElectionMode] = useState(false);
  // What kind of question: pick one of your choices, or rate it 1–5 with faces.
  const [kind, setKind] = useState<PollKind>(again?.kind ?? 'choice');
  const isRating = kind === 'rating';
  const isDates = kind === 'dates';
  // "Called it": a pick-one question about a real event; you mark what happened later.
  const [calledIt, setCalledIt] = useState(again?.calledIt ?? false);
  const pickKind = (k: PollKind, called = false, collect = false) => {
    setKind(k);
    setCalledIt(called);
    setIdeas(collect);
  };
  // "Hot take" chosen in the formats (a pick-one poll with Agree / Depends / Disagree ready).
  const [hot, setHot] = useState(false);
  // "Ideas first": people add the choices, then everyone votes (the choices typed here are optional starters).
  const [ideas, setIdeas] = useState(false);
  const [busy, setBusy] = useState(false);
  // Closed the sign-in sheet without a profile: say the poll is kept (it is) and what is needed to post it.
  const [askedOnce, setAskedOnce] = useState(false);
  // A draft of what you typed, kept on this phone for this visit: Close, a closed sign-in or a dropped connection never
  // throws a filled poll away. Restored when Create opens empty; cleared once the poll is made.
  const DRAFT = 'election-create-draft';
  useEffect(() => {
    if (again || initialTitle) return;
    try {
      const d = JSON.parse(sessionStorage.getItem(DRAFT) ?? 'null') as { title?: string; choices?: string[]; kind?: PollKind; calledIt?: boolean; category?: string; hot?: boolean; ideas?: boolean } | null;
      if (d?.title || d?.choices?.some(Boolean)) {
        if (d.title) setTitle(d.title);
        if (d.kind) setKind(d.kind);
        if (d.calledIt) setCalledIt(true);
        if (d.hot) setHot(true);
        if (d.ideas) setIdeas(true);
        if (d.category && (CATEGORIES as readonly string[]).includes(d.category)) setCategory(d.category);
        if (d.choices?.length) fill(d.choices.filter(Boolean));
        // Your poll as you left it: straight back to the question.
        firstStep.current = 'write';
        setStep('write');
        setSetupDone(true);
        setTopicSet(true);
      }
    } catch {}
    // Once, on opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      if (title.trim() || choices.some((c) => c.trim())) sessionStorage.setItem(DRAFT, JSON.stringify({ title, choices, kind, calledIt, category, hot, ideas }));
    } catch {}
  }, [title, choices, kind, calledIt, category, hot, ideas]);
  const [error, setError] = useState('');
  // Errors show under the field they belong to, and focus moves there.
  const [fieldError, setFieldError] = useState<{ title?: string; choices?: string; end?: string; group?: string; start?: string }>({});
  // P3 settings are one line of chips; each opens its small box underneath, one at a time.
  const [open, setOpen] = useState<'ends' | 'starts' | 'topic' | 'details' | 'group' | 'reveal' | null>(null);
  // The less-used settings (Election mode, votes can change, end time, details) wait behind "More options".
  const [showMore, setShowMore] = useState(false);
  // All settings sit behind one "Settings" row until opened (an "Ask again" poll opens with them shown).
  const [settingsOpen, setSettingsOpen] = useState(!!again);
  // "See how it looks": the poll as a voter first meets it, before posting.
  const [previewing, setPreviewing] = useState(false);
  // "A poll like this is already live": looked up a moment after you stop typing the question (not for "Ask again").
  const [similar, setSimilar] = useState<{ id: string; title: string; votes: number }[]>([]);
  const [simHidden, setSimHidden] = useState(false);
  // "Speak your question" (owner, Oct 2026: typing Hindi on a phone is slow): the phone's own speech-to-text, only where
  // the browser has it (Chrome on Android, Safari). Hindi screens listen for Hindi; English and Hinglish for Indian English.
  const [speechOk, setSpeechOk] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakErr, setSpeakErr] = useState(false);
  useEffect(() => setSpeechOk('SpeechRecognition' in window || 'webkitSpeechRecognition' in window), []);
  // Create in three short steps (owner, Oct 2026: "first ask what kind of poll, then the topic"): the kind of poll, what
  // it is about, then the question and choices, with help that fits both. "Ask again" starts at the question (all set).
  type Step = 'type' | 'topic' | 'write';
  const firstStep = useRef<Step>(again ? 'write' : 'type');
  const [step, setStep] = useState<Step>(firstStep.current);
  // Both picked once: changing one later comes straight back to the question.
  const [setupDone, setSetupDone] = useState(!!again);
  // A few choices first, the rest one tap away.
  const [allTypes, setAllTypes] = useState(false);
  const [allTopics, setAllTopics] = useState(false);
  const [topicSet, setTopicSet] = useState(!!again || !!initialTopic);
  // Each step is a history entry, so the phone's Back goes one step back, not out of Create.
  const go = (s: Step) => {
    setStep(s);
    try {
      window.history.pushState({ createStep: s }, '');
    } catch {}
    window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    const onPop = (e: PopStateEvent) => setStep((e.state?.createStep as Step | undefined) ?? firstStep.current);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Like a WhatsApp poll: typing in the last box adds the next empty one (up to 10), so there is no "add" step.
  const setChoice = (i: number, v: string) => {
    const grow = i === choices.length - 1 && v.trim() !== '' && choices.length < MAX_CHOICES;
    setChoices((c) => [...c.map((x, j) => (j === i ? v : x)), ...(grow ? [''] : [])]);
    if (grow) {
      setEmojis((e) => [...e, '']);
      setPhotos((x) => [...x, '']);
    }
  };
  const setPicture = (i: number, p: Picture) => {
    setEmojis((e) => e.map((x, j) => (j === i ? p.emoji.trim() : x)));
    setPhotos((x) => x.map((v, j) => (j === i ? p.photo : v)));
  };
  const removeChoice = (i: number) => {
    setChoices((x) => x.filter((_, j) => j !== i));
    setEmojis((x) => x.filter((_, j) => j !== i));
    setPhotos((x) => x.filter((_, j) => j !== i));
  };
  const fill = (next: string[]) => {
    const list = [...next, ...(next.length < MAX_CHOICES ? [''] : [])];
    setChoices(list);
    setEmojis(list.map(() => ''));
    setPhotos(list.map(() => ''));
    setFieldError({});
  };
  // A ready-made idea: question and choices in one tap (only offered while the form is empty).
  const topicIdeas = t.ideaSets[category] ?? [];
  function idea(n: number) {
    const it = topicIdeas[n];
    setTitle(it.q);
    fill(it.c);
  }
  // Quick start: fill the shape of a common duel, then the person only types the question (and names).
  // Phone keyboards: Enter moves to the next box (it used to send a half-filled form); on the last choice it creates the duel.
  function onEnter(e: React.KeyboardEvent<HTMLInputElement>, next: string | null) {
    if (e.key !== 'Enter' || !next) return;
    e.preventDefault();
    document.getElementById(next)?.focus();
  }
  const typedChoices = choices.some((c) => c.trim());
  useEffect(() => {
    if (again || simHidden || title.trim().length < MIN_TITLE) return setSimilar([]);
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      const c = choices.map((x) => x.trim()).filter(Boolean).join('|');
      fetch(`/api/polls/similar?q=${encodeURIComponent(title.trim())}${c ? `&c=${encodeURIComponent(c)}` : ''}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { polls?: { id: string; title: string; votes: number }[] } | null) => setSimilar(d?.polls ?? []))
        .catch(() => undefined);
    }, 700);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [title, choices, again, simHidden]);
  // "Virat, Rohit or Dhoni?" → offer those three as the choices (until you type your own).
  const fromQuestion = typedChoices || kind === 'rating' || kind === 'dates' ? null : choicesFromQuestion(title);
  const filledCount = isDates ? filledDates.length : choices.filter((c) => c.trim()).length;
  // The main button says what is still missing, then "Create duel".
  const ready = title.trim().length >= MIN_TITLE && (isRating || ideas || filledCount >= MIN_CHOICES);
  const buttonText = busy ? t.creating : title.trim().length < MIN_TITLE ? t.needQuestion : !isRating && !ideas && filledCount < MIN_CHOICES ? t.needChoices(MIN_CHOICES - filledCount) : t.createDuel;
  // The end time as the phone shows it (local time, no seconds), for the picker's earliest allowed value.
  const localNow = () => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
    return d.toISOString().slice(0, 16);
  };

  function speak() {
    type Rec = { lang: string; interimResults: boolean; maxAlternatives: number; start(): void; onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript.trim() ?? '';
      if (!said) return;
      const q = (/[?？]$/u.test(said) ? said : `${said}?`).slice(0, MAX_TITLE);
      setTitle(q.charAt(0).toUpperCase() + q.slice(1));
      setFieldError((f) => ({ ...f, title: undefined }));
      // "Chai ya coffee?" fills the choices too, when none are typed yet.
      const parts = kind === 'rating' || kind === 'dates' || hot ? null : choicesFromQuestion(q);
      if (parts && !choices.some((c) => c.trim())) fill(parts);
    };
    r.onerror = () => setSpeakErr(true);
    r.onend = () => setListening(false);
    setSpeakErr(false);
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      setSpeakErr(true);
    }
  }

  function check() {
    const filled = choices.map((c) => c.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const errs: { title?: string; choices?: string; end?: string; group?: string; start?: string } = {};
    if (title.trim().length < MIN_TITLE) errs.title = t.errTitle;
    if (isRating) {
      /* a rating poll has its five faces already */
    } else if (isDates) {
      if (filledDates.length < MIN_CHOICES) errs.choices = t.errChoices;
    } else if (!ideas && filled.length < MIN_CHOICES) errs.choices = t.errChoices;
    // The server's own rule (Hindi vowel signs count), so the form and the server never disagree.
    else if (new Set(filled.map(sameKey)).size !== filled.length) errs.choices = t.errSame;
    // A group size outside 2–MAX_GROUP used to be dropped without a word.
    if (groupSize && !isGroup) errs.group = t.errGroup(MAX_GROUP);
    if (endsAt && !(new Date(endsAt).getTime() > Date.now())) errs.end = t.errEnd;
    if (startsAt) {
      const at = new Date(startsAt).getTime();
      if (!(at > Date.now() && at < Date.now() + START_MAX_DAYS * 86_400_000) || (endsAt && new Date(endsAt).getTime() <= at)) errs.start = t.errStart;
    }
    setFieldError(errs);
    if (errs.title) document.getElementById('title')?.focus();
    else if (errs.choices) document.querySelector<HTMLInputElement>('input[data-choice]')?.focus();
    else if (errs.group) {
      setOpen('group');
      setSettingsOpen(true);
      setTimeout(() => document.getElementById('group')?.focus(), 0);
    } else if (errs.start) {
      setOpen('starts');
      setSettingsOpen(true);
      setShowMore(true);
      setTimeout(() => document.getElementById('start')?.focus(), 0);
    } else if (errs.end) {
      // The end time sits under "More options": open it so the message is seen.
      setOpen('ends');
      setSettingsOpen(true);
      setTimeout(() => document.getElementById('end')?.focus(), 0);
    }
    return !errs.title && !errs.choices && !errs.end && !errs.group && !errs.start;
  }

  function post() {
    if (busy || !check()) return;
    // Making a poll needs a profile (voting never does). The poll stays filled in behind the sign-in sheet, and is
    // sent as soon as the profile is ready.
    if (!signed) return setAsk(true);
    send();
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    post();
  }
  async function send() {
    setBusy(true);
    setError('');
    const kept = choices.map((c, i) => ({ c: c.trim(), e: emojiAt(i), p: photos[i] ?? '' })).filter((x) => x.c);
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        category,
        kind,
        calledIt: calledIt && !ideas,
        collectIdeas: ideas && kind === 'choice',
        options: isRating ? RATING_LABELS : isDates ? filledDates.map(dateLabel) : kept.map((x) => x.c),
        emojis: isRating ? RATING_EMOJIS : isDates ? [] : kept.map((x) => x.e),
        photos: isRating || isDates ? [] : kept.map((x) => x.p),
        shuffle: shuffle && !isDates && !isRating,
        suggestionsOn: suggestionsOn && (kind === 'choice' || kind === 'multi') && !ideas,
        allowOther: otherOn && kind === 'choice' && !calledIt && !ideas,
        showMaker,
        showMakerPick: showMaker && makerPick && category !== 'politics',
        previousId: again?.id,
        hideUntilVoted,
        revealIn: isGroup || calledIt ? 'now' : revealIn,
        allowChange,
        electionMode,
        groupSize: isGroup ? groupN : undefined,
        // A group poll with no end time would wait forever for one missing friend: it ends in 3 days unless you pick a time.
        startsAt: startsAt && !ideas ? new Date(startsAt).toISOString() : undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : isGroup ? new Date(Date.now() + GROUP_DEFAULT_DAYS * 86_400_000).toISOString() : undefined,
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.id) {
      rememberMyPoll(data.id, data.manageKey);
      try {
        sessionStorage.removeItem(DRAFT);
      } catch {}
      // Replace, not push: Back from the new poll must not reopen a filled Create (it looked like it had not worked).
      return router.replace(`/p/${data.id}?new=1${askBack ? '&back=1' : ''}`);
    }
    setBusy(false);
    // Signed out on another tab, or the sign-in ran out: ask again.
    if (res?.status === 401) {
      setSigned(false);
      return setAsk(true);
    }
    setError(!res && !navigator.onLine ? t.createOffline : data?.error ? apiMsg(lang, data.error) : t.errGeneric);
  }

  const TONES = ['input', 'feedback', 'control', 'agents', 'output', 'trust'];
  const toggleOpen = (k: 'ends' | 'starts' | 'topic' | 'details' | 'group' | 'reveal') => setOpen((o) => (o === k ? null : k));
  const endsLabel = endsAt ? new Date(endsAt).toLocaleString(dateLocale(lang), { day: 'numeric', month: monthStyle(lang), hour: 'numeric', minute: '2-digit' }) : t.setEnds;

  // Create, top to bottom (docs/DESIGN.md, "Create, tidied"): the question in a real box, the choices, then every
  // setting as one list of rows (the poll type first, the less-used ones behind "More options"). One main button.
  // Social formats (owner, Oct 2026: "expose social formats, not poll types"): the same poll kinds underneath, named
  // for what people do with them. "Hot take" is a pick-one poll that starts with 🔥 Agree / 🤔 Depends / 🙅 Disagree.
  const pickHot = () => {
    pickKind('choice');
    setHot(true);
    if (choices.every((c) => !c.trim())) {
      fill(t.hotChoices);
      setEmojis([...HOT_EMOJIS, ''].slice(0, t.hotChoices.length + 1));
    }
  };
  // The four most used kinds first (Miller's and Hick's laws: fewer choices, quicker decision); "More kinds of polls"
  // opens the other four, and the ways to make several polls at once.
  const TYPES = [
    { k: 'choice', main: true, Icon: CircleDot, name: t.fmtAsk, desc: t.typeDesc.choice, pick: () => { setHot(false); pickKind('choice'); } },
    { k: 'hot', main: true, Icon: Flame, name: t.fmtHot, desc: t.typeDesc.hot, pick: pickHot },
    { k: 'called', main: true, Icon: WandSparkles, name: t.fmtPredict, desc: t.typeDesc.called, pick: () => { setHot(false); pickKind('choice', true); } },
    { k: 'rating', main: true, Icon: Smile, name: t.fmtRate, desc: t.typeDesc.rating, pick: () => { setHot(false); pickKind('rating'); } },
    { k: 'multi', main: false, Icon: ListChecks, name: t.formatMulti, desc: t.typeDesc.multi, pick: () => { setHot(false); pickKind('multi'); } },
    { k: 'rank', main: false, Icon: ListOrdered, name: t.formatRank, desc: t.typeDesc.rank, pick: () => { setHot(false); pickKind('rank'); } },
    { k: 'dates', main: false, Icon: CalendarDays, name: t.fmtDecide, desc: t.typeDesc.dates, pick: () => { setHot(false); pickKind('dates'); } },
    { k: 'ideas', main: false, Icon: Lightbulb, name: t.fmtIdeas, desc: t.typeDesc.ideas, pick: () => { setHot(false); pickKind('choice', false, true); } },
  ];
  const current = TYPES.find((x) => x.k === (ideas ? 'ideas' : calledIt ? 'called' : kind === 'choice' && hot ? 'hot' : kind)) ?? TYPES[0];
  // Opened "More…", or the one you picked earlier is among the rest: everything shows.
  const typesAll = allTypes || (setupDone && !current.main);
  const topicsAll = allTopics || (topicSet && !FIRST_TOPICS.includes(category as Category));
  const pickType = (x: (typeof TYPES)[number]) => {
    x.pick();
    if (setupDone || topicSet) {
      setSetupDone(true);
      go('write');
    } else go('topic');
  };
  const pickTopic = (c: Category) => {
    setCategory(c);
    setTopicSet(true);
    setSetupDone(true);
    go('write');
  };
  // The question box's hint says what to type for this kind of poll, never an example that may not fit yours.
  const questionPh = calledIt ? t.calledPh : hot && kind === 'choice' ? t.hotPh : isRating ? t.rateQPh : isDates ? t.datesQPh : t.questionPh;

  // The poll as voters will meet it: drawn in the "See how it looks" sheet, and live beside the form on a computer.
  const endsText = endsAt ? endsLabel : isGroup ? new Date(Date.now() + GROUP_DEFAULT_DAYS * 86_400_000).toLocaleString(dateLocale(lang), { day: 'numeric', month: monthStyle(lang), hour: 'numeric', minute: '2-digit' }) : null;
  const preview: PreviewPoll = {
    title: title.trim(),
    description: description.trim(),
    kind,
    calledIt,
    group: isGroup ? groupN : null,
    electionMode,
    choices: isDates ? filledDates.map((d) => ({ label: dateLabel(d), emoji: '', photo: '' })) : choices.map((c, i) => ({ label: c.trim(), emoji: emojiAt(i), photo: photos[i] ?? '' })).filter((c) => c.label),
    rateWords: t.rateWords,
    rateEmojis: RATING_EMOJIS,
    other: otherOn && kind === 'choice' && !calledIt && !ideas,
  };

  // Step 1: what kind of poll. Each type is one tap with one line on what voters do. Packs and battles (several polls
  // in one go) sit last, as other ways to start.
  if (step === 'type') {
    return (
      <div className="create-step">
        {askBack && <p className="create-again" role="status"><Repeat size={16} strokeWidth={2} aria-hidden /><span>{t.askBackLead}</span></p>}
        <h2 className="create-step__title">{t.stepType}</h2>
        <div className="create-types create-types--step" role="list">
          {TYPES.filter((x) => typesAll || x.main).map((x) => (
            <button key={x.k} type="button" role="listitem" className={'create-type' + (setupDone && x.k === current.k ? ' is-on' : '')} onClick={() => pickType(x)}>
              <span className="create-type__disc" aria-hidden><x.Icon size={18} strokeWidth={1.75} /></span>
              <span><strong>{x.name}</strong><span className="small muted">{x.desc}</span></span>
              {setupDone && x.k === current.k ? <Check size={16} strokeWidth={2.25} aria-hidden /> : <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />}
            </button>
          ))}
        </div>
        {!typesAll && (
          <button type="button" className="link-like create-more" onClick={() => setAllTypes(true)}>
            <ChevronDown size={16} strokeWidth={2} aria-hidden /> {t.moreTypes(TYPES.filter((x) => !x.main).length + (setupDone ? 0 : 2))}
          </button>
        )}
        {typesAll && !setupDone && (
          <section className="al-block">
            <h3 className="al-block__title">{t.packOr}</h3>
            <ul className="al-listcard">
              <li>
                <Link href="/create/pack" className="al-row">
                  <span className="al-row__disc is-faces" style={{ '--tone': 'var(--p-control)' } as React.CSSProperties} aria-hidden>🏏</span>
                  <span className="al-row__main">
                    <span className="al-row__title">{t.packRow}</span>
                    <span className="al-row__meta">{t.packRowNote}</span>
                  </span>
                  <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
                </Link>
              </li>
              <li>
                <Link href="/create/battle" className="al-row">
                  <span className="al-row__disc is-faces" style={{ '--tone': 'var(--p-feedback)' } as React.CSSProperties} aria-hidden>⚔️</span>
                  <span className="al-row__main">
                    <span className="al-row__title">{t.battleRow}</span>
                    <span className="al-row__meta">{t.battleRowNote}</span>
                  </span>
                  <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
                </Link>
              </li>
            </ul>
          </section>
        )}
      </div>
    );
  }
  // Step 2: what it is about. The topic decides the ideas offered next and where the poll is listed.
  if (step === 'topic') {
    return (
      <div className="create-step">
        <button type="button" className="link-like small muted create-step__back" onClick={() => window.history.back()}>
          <ArrowLeft size={14} strokeWidth={2} aria-hidden /> {t.back}
        </button>
        <h2 className="create-step__title">{t.stepTopic}</h2>
        <div className="create-topics">
          {CATEGORIES.filter((c) => topicsAll || FIRST_TOPICS.includes(c)).map((c) => (
            <button key={c} type="button" className={'create-topic' + (topicSet && c === category ? ' is-on' : '')} aria-pressed={topicSet && c === category} onClick={() => pickTopic(c)}>
              <span className="create-topic__face" aria-hidden>{TOPIC_EMOJI[c]}</span>
              <span>{t.categories[c] ?? c}</span>
            </button>
          ))}
        </div>
        {!topicsAll && (
          <button type="button" className="link-like create-more" onClick={() => setAllTopics(true)}>
            <ChevronDown size={16} strokeWidth={2} aria-hidden /> {t.moreTopics(CATEGORIES.length - FIRST_TOPICS.length)}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="create-grid">
    <form className="builder create" onSubmit={submit}>
      {/* What you picked in steps 1 and 2, each one tap to change (your question and choices stay). */}
      <div className="row wrap create-picked">
        <button type="button" className="chip create-picked__chip" aria-label={`${t.changeType}: ${current.name}`} onClick={() => go('type')}>
          <current.Icon size={14} strokeWidth={2} aria-hidden /> {current.name} <PenLine size={12} strokeWidth={2} aria-hidden />
        </button>
        <button type="button" className="chip create-picked__chip" aria-label={`${t.changeTopic}: ${t.categories[category] ?? category}`} onClick={() => go('topic')}>
          <span aria-hidden>{TOPIC_EMOJI[category as Category] ?? ''}</span> {t.categories[category] ?? category} <PenLine size={12} strokeWidth={2} aria-hidden />
        </button>
      </div>
      {again && (
        <p className="create-again" role="status">
          <Repeat size={16} strokeWidth={2} aria-hidden />
          <span><strong>{t.askingAgain(again.title)}</strong> <span className="muted">{t.askingAgainLine}</span></span>
        </p>
      )}
      {/* 1. The question (P1): a real box, so it is clear where to type. */}
      <section className="create-block">
        <label htmlFor="title" className="create-label">{t.yourQuestion}</label>
        <textarea
          id="title"
          className="create-q"
          rows={2}
          enterKeyHint="next"
          autoCapitalize="sentences"
          autoComplete="off"
          value={title}
          maxLength={MAX_TITLE}
          placeholder={questionPh}
          aria-invalid={!!fieldError.title}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              document.getElementById('choice-0')?.focus();
            }
          }}
          onChange={(e) => {
            setTitle(e.target.value.replace(/\n/g, ' '));
            setFieldError((f) => ({ ...f, title: undefined }));
          }}
        />
        {speechOk && (
          <p className="create-speak" aria-live="polite">
            {listening ? (
              <span className="small"><span className="live-dot" aria-hidden /> {t.speakListening}</span>
            ) : (
              <button type="button" className="link-like small" onClick={speak}><Mic size={14} strokeWidth={2} aria-hidden /> {t.speakBtn}</button>
            )}
            {speakErr && !listening && <span className="small muted"> {t.speakErr}</span>}
          </p>
        )}
        {title.length >= MAX_TITLE - 20 && <p className="small muted create-count" aria-live="polite">{t.charsLeft(MAX_TITLE - title.length)}</p>}
        {fieldError.title && <p className="field-error" role="alert">{fieldError.title}</p>}
        {/* P2: a live poll that asks the same thing. Voting there gets you results now; posting yours is still fine. */}
        {similar.length > 0 && !simHidden && (
          <div className="create-similar" role="status">
            <p className="label">{t.simTitle}</p>
            {similar.map((p) => (
              <Link key={p.id} href={`/p/${p.id}`} className="create-similar__row">
                <span className="create-similar__title">{p.title}</span>
                <span className="small muted">{t.votes(p.votes)} · {t.simVote}</span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </Link>
            ))}
            <button type="button" className="link-like small muted" onClick={() => setSimHidden(true)}>{t.simKeep}</button>
          </div>
        )}
        {fromQuestion && (
          <button type="button" className="create-suggest" onClick={() => fill(fromQuestion)}>
            <Sparkles size={14} strokeWidth={1.75} aria-hidden />
            <span><strong>{t.useAsChoices}</strong> <span className="muted">{fromQuestion.join(' · ')}</span></span>
          </button>
        )}
        {calledIt && <p className="small muted">{t.calledHint}</p>}
        {/* P3: ideas, only on an empty form (a blank page is the hardest part); one scrolling row. */}
        {/* Ideas fit the type and the topic you picked (a food poll never gets cricket ideas); only for "Pick one". */}
        {!title.trim() && !typedChoices && current.k === 'choice' && (
          <div className="create-ideas-wrap">
            <span className="small muted"><Lightbulb size={12} strokeWidth={1.75} aria-hidden /> {t.ideasLabel}</span>
            <div className="create-ideas">
              {topicIdeas.map((it, n) => (
                <button key={n} type="button" className="chip" onClick={() => idea(n)}>{it.q}</button>
              ))}
              <button type="button" className="chip" onClick={() => fill([t.yes, t.no])}>{t.starterYesNo}</button>
            </div>
          </div>
        )}
      </section>

      {/* 2. The choices: a picture and a name each; typing in the last row adds the next one. */}
      <section className="create-block">
        <p className="create-label">{isRating ? t.formatRate : isDates ? t.formatDates : ideas ? t.brainStartChoices : t.choicesTitle}</p>
        {isDates ? (
          <div className="create-dates">
            {dateVals.map((d, i) => (
              <span key={i} className={'search create-date' + (!d && i === dateVals.length - 1 && i >= 2 ? ' is-new' : '')}>
                <CalendarDays size={16} strokeWidth={1.75} aria-hidden />
                <input id={`choice-${i}`} data-choice type="date" min={localNow().slice(0, 10)} value={d} aria-label={t.dateN(i + 1)} onChange={(e) => { setDate(i, e.target.value); setFieldError((f) => ({ ...f, choices: undefined })); }} />
                {d && <span className="small muted">{dateLabel(d)}</span>}
                {dateVals.length > 2 && d && (
                  <button type="button" className="icon-btn builder-remove" aria-label={t.removeChoice(i + 1)} onClick={() => setDateVals((x) => x.filter((_, j) => j !== i))}>
                    <X size={14} strokeWidth={1.75} aria-hidden />
                  </button>
                )}
              </span>
            ))}
            <p className="small muted">{t.datesHint}</p>
          </div>
        ) : isRating ? (
          <>
            <div className="rate-scale is-preview" aria-hidden>
              {RATING_EMOJIS.map((e, n) => (
                <span key={e} className="rate-step"><span className="rate-step-face">{e}</span><span className="rate-step-word">{t.rateWords[n]}</span></span>
              ))}
            </div>
            <p className="small muted">{t.rateHint}</p>
          </>
        ) : (
          <div className={'tot-options duel-options is-ballot builder-rows' + (electionMode ? '' : ' no-num')}>
            {choices.map((c, i) => {
              const isNew = i === choices.length - 1 && !c.trim() && choices.length > 2;
              return (
                <div
                  key={i}
                  className={'tot-option duel-option builder-row' + (isNew ? ' is-new' : '')}
                  style={{ '--pc': `var(--p-${TONES[i % TONES.length]})` } as React.CSSProperties}
                >
                  {electionMode && <span className="tot-letter">{i + 1}</span>}
                  <span className="duel-body">
                    {/* The choice's picture: tap for emoji suggestions, popular emoji, or a photo from the phone. */}
                    <button
                      type="button"
                      className={'face-pick' + (photos[i] ? ' has-photo' : emojiAt(i) ? ' has-emoji' : '')}
                      aria-label={t.pictureN(i + 1)}
                      onClick={() => setPicking(i)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {photos[i] ? <img src={photos[i]} alt="" /> : emojiAt(i) ? <span>{emojiAt(i)}</span> : <ImagePlus size={18} strokeWidth={1.75} aria-hidden />}
                    </button>
                    <input
                      id={`choice-${i}`}
                      className="duel-name builder-name"
                      enterKeyHint={i < choices.length - 1 ? 'next' : 'go'}
                      autoCapitalize="words"
                      autoComplete="off"
                      data-choice
                      value={c}
                      maxLength={MAX_CHOICE}
                      aria-label={t.choiceN(i + 1)}
                      placeholder={isNew ? `+ ${t.addChoiceRow}` : t.choiceN(i + 1)}
                      aria-invalid={!!fieldError.choices}
                      onKeyDown={(e) => onEnter(e, i < choices.length - 1 ? `choice-${i + 1}` : null)}
                      onChange={(e) => {
                        setChoice(i, e.target.value);
                        setFieldError((f) => ({ ...f, choices: undefined }));
                      }}
                    />
                  </span>
                  {choices.length > 2 && !isNew && (
                    <span className="evm-row">
                      <button type="button" className="icon-btn builder-remove" aria-label={t.removeChoice(i + 1)} onClick={() => removeChoice(i)}>
                        <X size={14} strokeWidth={1.75} aria-hidden />
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {kind === 'multi' && <p className="small muted">{t.multiHint}</p>}
        {kind === 'rank' && <p className="small muted">{t.rankHint}</p>}
        {fieldError.choices && <p className="field-error" role="alert">{fieldError.choices}</p>}
      </section>

      {/* 3. Settings, folded into one row until opened (owner, Oct 2026, from the product feedback: a first poll is a
          question, its choices and Start poll). The row says what is set now; open, it is the full list of rows. */}
      <section className="create-block">
        {!settingsOpen ? (
          <ul className="al-listcard create-settings">
            <li><Row icon={SlidersHorizontal} name={t.settingsLabel} open={false} onClick={() => setSettingsOpen(true)} /></li>
          </ul>
        ) : (<>
        <p className="create-label">{t.settingsLabel}</p>
        <ul className="al-listcard create-settings">
          <li><Row icon={EyeOff} name={t.setHidden} note={t.hideResultsNote} on={hideUntilVoted} onClick={() => setHide((v) => !v)} /></li>
          {/* Show results at a set time (not for group polls or "Called it": those open by themselves). */}
          {!isGroup && !calledIt && (
            <li>
              <Row icon={Timer} name={t.setReveal} value={t.revealNames[revealIn]} open={open === 'reveal'} onClick={() => toggleOpen('reveal')} />
              {open === 'reveal' && (
                <div className="create-panel">
                  <div className="row wrap" role="radiogroup" aria-label={t.setReveal}>
                    {REVEAL_IN.map((k) => (
                      <button key={k} type="button" role="radio" aria-checked={revealIn === k} className={'chip' + (revealIn === k ? ' chip-on' : '')} onClick={(e) => steady(e.currentTarget, () => setRevealIn(k))}>
                        {t.revealNames[k]}
                      </button>
                    ))}
                  </div>
                  <p className="small muted">{t.revealNote}</p>
                </div>
              )}
            </li>
          )}
          <li><Row icon={UserRound} name={t.setShowMe} note={t.setShowMeNote} on={showMaker} onClick={() => setShowMaker((v) => !v)} /></li>
          {showMaker && category !== 'politics' && <li><Row icon={Eye} name={t.setMakerPick} note={t.setMakerPickNote} on={makerPick} onClick={() => setMakerPick((v) => !v)} /></li>}
          {kind === 'choice' && !calledIt && !ideas && <li><Row icon={PenLine} name={t.setOther} note={t.setOtherNote} on={otherOn} onClick={() => setOtherSet(!otherOn)} /></li>}
          {showMore || endsAt || startsAt || isGroup || allowChange || electionMode || shuffle || description.trim() || fieldError.end || fieldError.start ? (
            <>
              {!ideas && (
                <li>
                  <Row icon={Timer} name={t.setStart} value={startsAt ? new Date(startsAt).toLocaleString(dateLocale(lang), { day: 'numeric', month: monthStyle(lang), hour: 'numeric', minute: '2-digit' }) : undefined} open={open === 'starts' || !!fieldError.start} onClick={() => toggleOpen('starts')} />
                  {(open === 'starts' || fieldError.start) && (
                    <div className="create-panel">
                      <span className="search">
                        <Timer size={14} strokeWidth={1.75} aria-hidden />
                        <input id="start" type="datetime-local" min={localNow()} value={startsAt} aria-label={t.setStart} aria-invalid={!!fieldError.start} onChange={(e) => { setStartsAt(e.target.value); setFieldError((f) => ({ ...f, start: undefined })); }} />
                      </span>
                      <p className="small muted">{t.opensNote}</p>
                      {startsAt && <button type="button" className="link-like small muted" onClick={() => setStartsAt('')}>{t.startsClear}</button>}
                      {fieldError.start && <p className="field-error" role="alert">{fieldError.start}</p>}
                    </div>
                  )}
                </li>
              )}
              <li>
                <Row icon={Clock} name={t.setEnds} value={endsAt ? endsLabel : undefined} open={open === 'ends' || !!fieldError.end} onClick={() => toggleOpen('ends')} />
                {(open === 'ends' || fieldError.end) && (
                  <div className="create-panel">
                    <span className="search">
                      <Clock size={14} strokeWidth={1.75} aria-hidden />
                      <input id="end" type="datetime-local" min={localNow()} value={endsAt} aria-label={t.ends} aria-invalid={!!fieldError.end} onChange={(e) => { setEndsAt(e.target.value); setFieldError((f) => ({ ...f, end: undefined })); }} />
                    </span>
                    {endsAt && <button type="button" className="link-like small muted" onClick={() => setEndsAt('')}>{t.endsClear}</button>}
                    {fieldError.end && <p className="field-error" role="alert">{fieldError.end}</p>}
                  </div>
                )}
              </li>
              <li>
                <Row icon={Users} name={t.setGroup} value={isGroup ? String(groupN) : undefined} open={open === 'group'} onClick={() => toggleOpen('group')} />
                {open === 'group' && (
                  <div className="create-panel">
                    <span className="search">
                      <Users size={14} strokeWidth={1.75} aria-hidden />
                      <input id="group" type="number" inputMode="numeric" min={2} max={MAX_GROUP} value={groupSize} placeholder="12" aria-label={t.grpHow} onChange={(e) => { setGroupSize(e.target.value.replace(/\D/g, '').slice(0, 3)); setFieldError((f) => ({ ...f, group: undefined })); }} />
                    </span>
                    {fieldError.group ? <p className="small duel-error" role="alert">{fieldError.group}</p> : <p className="small muted">{t.grpHow} {t.grpNote(GROUP_DEFAULT_DAYS)}</p>}
                  </div>
                )}
              </li>
              <li><Row icon={Repeat} name={t.setChange} note={t.allowChangeNote} on={allowChange} onClick={() => setChange((v) => !v)} /></li>
              {(kind === 'choice' || kind === 'multi') && !ideas && <li><Row icon={MessageSquarePlus} name={t.setSuggest} note={t.setSuggestNote} on={suggestionsOn} onClick={() => setSuggestionsOn((v) => !v)} /></li>}
              {(kind === 'choice' || kind === 'multi' || kind === 'rank') && !electionMode && <li><Row icon={Shuffle} name={t.setShuffle} note={t.setShuffleNote} on={shuffle} onClick={() => setShuffle((v) => !v)} /></li>}
              <li><Row icon={Landmark} name={t.setElection} note={t.setElectionShort} on={electionMode} onClick={() => setElectionMode((v) => !v)} /></li>
              <li>
                <Row icon={AlignLeft} name={t.setDetails} value={description.trim() || undefined} open={open === 'details'} onClick={() => toggleOpen('details')} />
                {open === 'details' && (
                  <div className="create-panel">
                    <span className="search">
                      <AlignLeft size={14} strokeWidth={1.75} aria-hidden />
                      <input id="desc" enterKeyHint="done" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setOpen(null))} value={description} maxLength={MAX_DETAILS} placeholder={t.detailsPh} aria-label={t.details} onChange={(e) => setDescription(e.target.value)} />
                    </span>
                  </div>
                )}
              </li>
            </>
          ) : (
            <li><Row icon={SlidersHorizontal} name={t.moreOptions} open={false} onClick={() => setShowMore(true)} /></li>
          )}
        </ul>
        </>)}
      </section>

      {error && <p className="duel-error" role="alert">{error}</p>}
      {picking !== null && (
        <PicturePicker
          name={choices[picking]?.trim() || t.choiceN(picking + 1)}
          value={{ emoji: emojiAt(picking), photo: photos[picking] ?? '' }}
          suggested={emojiFor(choices[picking] ?? '')}
          onChange={(p) => setPicture(picking, p)}
          onClose={() => setPicking(null)}
        />
      )}
      {ask && (
        <SignInSheet
          onClose={() => { setAsk(false); setAskedOnce(true); }}
          onDone={() => {
            setAsk(false);
            setSigned(true);
            send();
          }}
        />
      )}
      {previewing && (
        <CreatePreview
          {...preview}
          hideUntilVoted={hideUntilVoted}
          ends={endsText}
          postLabel={t.createDuel}
          busy={busy}
          onPost={() => { setPreviewing(false); post(); }}
          onClose={() => setPreviewing(false)}
        />
      )}
      {/* The one main step, pinned at thumb height on phones (like Next on a duel). */}
      <div className="builder-go">
        {!signed && <p className="small muted builder-go-hint" role={askedOnce ? 'status' : undefined}>{askedOnce ? t.signKept : t.createSignHint}</p>}
        <button className={'btn btn-primary btn-lg' + (ready ? ' is-ready' : '')} disabled={busy}>{buttonText}</button>
        {/* P3: once the poll is complete, a quiet way to see it as voters will, before it goes out. */}
        {ready && !busy && (
          <button type="button" className="link-like builder-preview" onClick={() => check() && setPreviewing(true)}>
            <Eye size={16} strokeWidth={2} aria-hidden /> {t.previewLink}
          </button>
        )}
      </div>
    </form>
    {/* Computers only (hidden on phones, where "See how it looks" opens the same card as a sheet): the poll drawn live
        as you type, so the empty space beside the form shows the result of every choice you make. */}
    <aside className="create-live" aria-label={t.previewTitle}>
      <p className="label preview-eyebrow">{t.previewTitle}</p>
      <PreviewCard poll={preview} t={t} live />
      <p className="small muted preview-rules">{previewRules(t, hideUntilVoted, preview.group, endsText)}</p>
    </aside>
    </div>
  );
}
