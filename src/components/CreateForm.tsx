'use client';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AlignLeft, CalendarDays, Check, ChevronDown, CircleDot, Clock, Eye, EyeOff, ImagePlus, Landmark, Lightbulb, ListChecks, ListOrdered, MessageSquarePlus, PenLine, Repeat, Shuffle, SlidersHorizontal, Smile, Sparkles, Tag, UserRound, Users, WandSparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { useLang, useT } from '@/lib/lang';
import { apiMsg } from '@/lib/i18n';
import { choicesFromQuestion, emojiFor } from '@/lib/createHelp';
import { namesPolitics } from '@/lib/moderation';
import { RATING_EMOJIS, RATING_LABELS, type PollKind } from '@/lib/rating';
import { rememberMyPoll } from './MyPolls';
import type { Picture } from './PicturePicker';
import PreviewCard, { previewRules, type PreviewPoll } from './PreviewCard';
import { dateLocale, monthStyle } from '@/lib/time';
import { GROUP_DEFAULT_DAYS, MAX_CHOICE, MAX_CHOICES, MAX_DETAILS, MAX_GROUP, MAX_TITLE, MIN_CHOICES, MIN_TITLE } from '@/lib/limits';
// Loaded only when opened (less code for cheap phones to download before the form works).
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
    </span>
    {on === undefined ? (
      <>
        {value && <span className="al-row__when create-row__value" suppressHydrationWarning>{value}</span>}
        <ChevronDown size={18} strokeWidth={1.75} className={'create-row__chev' + (isOpen ? ' is-open' : '')} aria-hidden />
      </>
    ) : (
      <span className={'switch' + (on ? ' is-on' : '')} aria-hidden><span /></span>
    )}
  </button>
);

/** "Ask again": the earlier poll's question, choices and type, filled in (the new poll links back to it). */
export type AskAgain = { id: string; title: string; options: string[]; emojis: string[]; kind: PollKind; calledIt: boolean; category: string; showMaker: boolean };

export default function CreateForm({ initialTitle = '', initialTopic, signedIn = false, again }: { initialTitle?: string; initialTopic?: string; signedIn?: boolean; again?: AskAgain }) {
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
  const [hideUntilVoted, setHide] = useState(true); // on by default: guess first, then see (the guess game)
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
  const pickKind = (k: PollKind, called = false) => {
    setKind(k);
    setCalledIt(called);
  };
  const [busy, setBusy] = useState(false);
  // Closed the sign-in sheet without a profile: say the poll is kept (it is) and what is needed to post it.
  const [askedOnce, setAskedOnce] = useState(false);
  // A draft of what you typed, kept on this phone for this visit: Close, a closed sign-in or a dropped connection never
  // throws a filled poll away. Restored when Create opens empty; cleared once the poll is made.
  const DRAFT = 'election-create-draft';
  useEffect(() => {
    if (again || initialTitle) return;
    try {
      const d = JSON.parse(sessionStorage.getItem(DRAFT) ?? 'null') as { title?: string; choices?: string[]; kind?: PollKind; calledIt?: boolean } | null;
      if (d?.title || d?.choices?.some(Boolean)) {
        if (d.title) setTitle(d.title);
        if (d.kind) setKind(d.kind);
        if (d.calledIt) setCalledIt(true);
        if (d.choices?.length) fill(d.choices.filter(Boolean));
      }
    } catch {}
    // Once, on opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      if (title.trim() || choices.some((c) => c.trim())) sessionStorage.setItem(DRAFT, JSON.stringify({ title, choices, kind, calledIt }));
    } catch {}
  }, [title, choices, kind, calledIt]);
  const [error, setError] = useState('');
  // Errors show under the field they belong to, and focus moves there.
  const [fieldError, setFieldError] = useState<{ title?: string; choices?: string; end?: string }>({});
  // P3 settings are one line of chips; each opens its small box underneath, one at a time.
  const [open, setOpen] = useState<'ends' | 'topic' | 'details' | 'group' | null>(null);
  // The less-used settings (Election mode, votes can change, end time, details) wait behind "More options".
  const [showMore, setShowMore] = useState(false);
  // All settings sit behind one "Settings" row until opened (an "Ask again" poll opens with them shown).
  const [settingsOpen, setSettingsOpen] = useState(!!again);
  // The poll-type row opens a list of the five types, each with one line on what it does.
  const [typeOpen, setTypeOpen] = useState(false);
  // "See how it looks": the poll as a voter first meets it, before posting.
  const [previewing, setPreviewing] = useState(false);

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
  function idea(n: number) {
    const it = t.ideas[n];
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
  // "Virat, Rohit or Dhoni?" → offer those three as the choices (until you type your own).
  const fromQuestion = typedChoices || kind === 'rating' || kind === 'dates' ? null : choicesFromQuestion(title);
  const filledCount = isDates ? filledDates.length : choices.filter((c) => c.trim()).length;
  // The main button says what is still missing, then "Create duel".
  const ready = title.trim().length >= MIN_TITLE && (isRating || filledCount >= MIN_CHOICES);
  const buttonText = busy ? t.creating : title.trim().length < MIN_TITLE ? t.needQuestion : !isRating && filledCount < MIN_CHOICES ? t.needChoices(MIN_CHOICES - filledCount) : t.createDuel;
  // The end time as the phone shows it (local time, no seconds), for the picker's earliest allowed value.
  const localNow = () => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
    return d.toISOString().slice(0, 16);
  };

  function check() {
    const filled = choices.map((c) => c.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const errs: { title?: string; choices?: string; end?: string } = {};
    if (title.trim().length < 3) errs.title = t.errTitle;
    if (isRating) {
      /* a rating poll has its five faces already */
    } else if (isDates) {
      if (filledDates.length < 2) errs.choices = t.errChoices;
    } else if (filled.length < 2) errs.choices = t.errChoices;
    else if (new Set(filled.map((c) => c.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') || c)).size !== filled.length) errs.choices = t.errSame;
    if (endsAt && !(new Date(endsAt).getTime() > Date.now())) errs.end = t.errEnd;
    setFieldError(errs);
    if (errs.title) document.getElementById('title')?.focus();
    else if (errs.choices) document.querySelector<HTMLInputElement>('input[data-choice]')?.focus();
    else if (errs.end) {
      // The end time sits under "More options": open it so the message is seen.
      setOpen('ends');
      setSettingsOpen(true);
      setTimeout(() => document.getElementById('end')?.focus(), 0);
    }
    return !errs.title && !errs.choices && !errs.end;
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
        calledIt,
        options: isRating ? RATING_LABELS : isDates ? filledDates.map(dateLabel) : kept.map((x) => x.c),
        emojis: isRating ? RATING_EMOJIS : isDates ? [] : kept.map((x) => x.e),
        photos: isRating || isDates ? [] : kept.map((x) => x.p),
        shuffle: shuffle && !isDates && !isRating,
        suggestionsOn: suggestionsOn && (kind === 'choice' || kind === 'multi'),
        allowOther: otherOn && kind === 'choice' && !calledIt,
        showMaker,
        previousId: again?.id,
        hideUntilVoted,
        allowChange,
        electionMode,
        groupSize: isGroup ? groupN : undefined,
        // A group poll with no end time would wait forever for one missing friend: it ends in 3 days unless you pick a time.
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
      return router.replace(`/p/${data.id}?new=1`);
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
  const toggleOpen = (k: 'ends' | 'topic' | 'details' | 'group') => setOpen((o) => (o === k ? null : k));
  const endsLabel = endsAt ? new Date(endsAt).toLocaleString(dateLocale(lang), { day: 'numeric', month: monthStyle(lang), hour: 'numeric', minute: '2-digit' }) : t.setEnds;

  // Create, top to bottom (docs/DESIGN.md, "Create, tidied"): the question in a real box, the choices, then every
  // setting as one list of rows (the poll type first, the less-used ones behind "More options"). One main button.
  const TYPES = [
    { k: 'choice', Icon: CircleDot, name: t.typePickOne, desc: t.typeDesc.choice, pick: () => pickKind('choice') },
    { k: 'called', Icon: WandSparkles, name: t.formatCalled, desc: t.typeDesc.called, pick: () => pickKind('choice', true) },
    { k: 'multi', Icon: ListChecks, name: t.formatMulti, desc: t.typeDesc.multi, pick: () => pickKind('multi') },
    { k: 'rank', Icon: ListOrdered, name: t.formatRank, desc: t.typeDesc.rank, pick: () => pickKind('rank') },
    { k: 'rating', Icon: Smile, name: t.formatRate, desc: t.typeDesc.rating, pick: () => pickKind('rating') },
    { k: 'dates', Icon: CalendarDays, name: t.formatDates, desc: t.typeDesc.dates, pick: () => pickKind('dates') },
  ];
  const current = TYPES.find((x) => x.k === (calledIt ? 'called' : kind)) ?? TYPES[0];
  // What the folded Settings row says: the poll type and the topic (the two people most often look for).
  const settingsSummary = `${current.name} · ${t.categories[category] ?? category}`;

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
    other: otherOn && kind === 'choice' && !calledIt,
  };

  return (
    <div className="create-grid">
    <form className="builder create" onSubmit={submit}>
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
          placeholder={calledIt ? t.calledPh : t.questionPh}
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
        {title.length >= MAX_TITLE - 20 && <p className="small muted create-count" aria-live="polite">{t.charsLeft(MAX_TITLE - title.length)}</p>}
        {fieldError.title && <p className="field-error" role="alert">{fieldError.title}</p>}
        {fromQuestion && (
          <button type="button" className="create-suggest" onClick={() => fill(fromQuestion)}>
            <Sparkles size={14} strokeWidth={1.75} aria-hidden />
            <span><strong>{t.useAsChoices}</strong> <span className="muted">{fromQuestion.join(' · ')}</span></span>
          </button>
        )}
        {calledIt && <p className="small muted">{t.calledHint}</p>}
        {/* P3: ideas, only on an empty form (a blank page is the hardest part); one scrolling row. */}
        {!title.trim() && !typedChoices && (
          <div className="create-ideas-wrap">
            <span className="small muted"><Lightbulb size={12} strokeWidth={1.75} aria-hidden /> {t.ideasLabel}</span>
            <div className="create-ideas">
              {t.ideas.map((it, n) => (
                <button key={n} type="button" className="chip" onClick={() => idea(n)}>{it.q}</button>
              ))}
              <button type="button" className="chip" onClick={() => fill([t.yes, t.no])}>{t.starterYesNo}</button>
            </div>
          </div>
        )}
      </section>

      {/* 2. The choices: a picture and a name each; typing in the last row adds the next one. */}
      <section className="create-block">
        <p className="create-label">{isRating ? t.formatRate : isDates ? t.formatDates : t.choicesTitle}</p>
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
            <li><Row icon={SlidersHorizontal} name={t.settingsLabel} value={settingsSummary} open={false} onClick={() => setSettingsOpen(true)} /></li>
          </ul>
        ) : (<>
        <p className="create-label">{t.settingsLabel}</p>
        <ul className="al-listcard create-settings">
          <li>
            <Row icon={current.Icon} name={t.typeLabel} value={current.name} open={typeOpen} tone="var(--p-input)" onClick={() => setTypeOpen((v) => !v)} />
            {typeOpen && (
              <div className="create-panel create-types" role="radiogroup" aria-label={t.typeLabel}>
                {TYPES.map((x) => (
                  <button key={x.k} type="button" role="radio" aria-checked={x.k === current.k} className={'create-type' + (x.k === current.k ? ' is-on' : '')} onClick={(e) => steady(e.currentTarget, x.pick)}>
                    <span className="create-type__disc" aria-hidden><x.Icon size={18} strokeWidth={1.75} /></span>
                    <span><strong>{x.name}</strong><span className="small muted">{x.desc}</span></span>
                    {x.k === current.k && <Check size={16} strokeWidth={2.25} aria-hidden />}
                  </button>
                ))}
              </div>
            )}
          </li>
          <li><Row icon={EyeOff} name={t.setHidden} note={t.hideResultsNote} on={hideUntilVoted} onClick={() => setHide((v) => !v)} /></li>
          <li><Row icon={UserRound} name={t.setShowMe} note={t.setShowMeNote} on={showMaker} onClick={() => setShowMaker((v) => !v)} /></li>
          {kind === 'choice' && !calledIt && <li><Row icon={PenLine} name={t.setOther} note={t.setOtherNote} on={otherOn} onClick={() => setOtherSet(!otherOn)} /></li>}
          <li>
            <Row icon={Tag} name={t.category} value={t.categories[category] ?? category} open={open === 'topic'} onClick={() => toggleOpen('topic')} />
            {open === 'topic' && (
              <div className="create-panel row wrap" role="radiogroup" aria-label={t.category}>
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={category === c} className={'chip' + (category === c ? ' chip-on' : '')} onClick={(e) => steady(e.currentTarget, () => setCategory(c))}>
                    {t.categories[c] ?? c}
                  </button>
                ))}
              </div>
            )}
          </li>
          {showMore || endsAt || isGroup || allowChange || electionMode || shuffle || description.trim() || fieldError.end ? (
            <>
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
                      <input id="group" type="number" inputMode="numeric" min={2} max={MAX_GROUP} value={groupSize} placeholder="12" aria-label={t.grpHow} onChange={(e) => setGroupSize(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </span>
                    <p className="small muted">{t.grpHow} {t.grpNote(GROUP_DEFAULT_DAYS)}</p>
                  </div>
                )}
              </li>
              <li><Row icon={Repeat} name={t.setChange} note={t.allowChangeNote} on={allowChange} onClick={() => setChange((v) => !v)} /></li>
              {(kind === 'choice' || kind === 'multi') && <li><Row icon={MessageSquarePlus} name={t.setSuggest} note={t.setSuggestNote} on={suggestionsOn} onClick={() => setSuggestionsOn((v) => !v)} /></li>}
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

      {photos.some(Boolean) && <p className="small muted">{t.photosHeld}</p>}
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
