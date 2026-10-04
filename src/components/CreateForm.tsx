'use client';
import { useRouter } from 'next/navigation';
import { AlignLeft, Check, ChevronDown, CircleDot, Clock, EyeOff, ImagePlus, Landmark, Lightbulb, ListChecks, ListOrdered, Repeat, SlidersHorizontal, Smile, Sparkles, Tag, Users, WandSparkles, X } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { useLang, useT } from '@/lib/lang';
import { apiMsg } from '@/lib/i18n';
import { choicesFromQuestion, emojiFor } from '@/lib/createHelp';
import { RATING_EMOJIS, RATING_LABELS, type PollKind } from '@/lib/rating';
import { rememberMyPoll } from './MyPolls';
import PicturePicker, { type Picture } from './PicturePicker';

// One settings row: icon disc, name (+ a quiet line), the current value or a switch, and a chevron for rows that open.
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

export default function CreateForm({ initialTitle = '', initialTopic }: { initialTitle?: string; initialTopic?: string }) {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(initialTopic ?? 'general');
  const [choices, setChoices] = useState(['', '']);
  // One optional emoji per choice, kept in step with the choices.
  const [emojis, setEmojis] = useState(['', '']);
  // An emoji box you have not touched shows a fitting emoji for the name ("Chai" → 🍵); once you type in it, yours wins.
  const [touched, setTouched] = useState([false, false]);
  // One optional photo per choice (a small JPEG made on the phone); a photo shows instead of the emoji.
  const [photos, setPhotos] = useState(['', '']);
  // Which choice's picture sheet is open.
  const [picking, setPicking] = useState<number | null>(null);
  const emojiAt = (i: number) => (touched[i] ? emojis[i] ?? '' : emojis[i] || emojiFor(choices[i] ?? ''));
  const [endsAt, setEndsAt] = useState('');
  const [hideUntilVoted, setHide] = useState(true); // on by default: guess first, then see (the guess game)
  const [allowChange, setChange] = useState(false);
  // A group poll: results open for everyone once this many have voted (typed as text; empty = not a group poll).
  const [groupSize, setGroupSize] = useState('');
  const groupN = Number.parseInt(groupSize, 10);
  const isGroup = Number.isFinite(groupN) && groupN >= 2 && groupN <= 200;
  // Election mode: the full booth ritual for this poll. Politics polls get it anyway (the server decides that).
  const [electionMode, setElectionMode] = useState(false);
  // "I am 18+, and these photos are me or people who said yes": ticked once in the picture sheet, before any photo.
  const [photoConsent, setPhotoConsent] = useState(false);
  // What kind of question: pick one of your choices, or rate it 1–5 with faces.
  const [kind, setKind] = useState<PollKind>('choice');
  const isRating = kind === 'rating';
  // "Called it": a pick-one question about a real event; you mark what happened later.
  const [calledIt, setCalledIt] = useState(false);
  const pickKind = (k: PollKind, called = false) => {
    setKind(k);
    setCalledIt(called);
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Errors show under the field they belong to, and focus moves there.
  const [fieldError, setFieldError] = useState<{ title?: string; choices?: string; end?: string }>({});
  // P3 settings are one line of chips; each opens its small box underneath, one at a time.
  const [open, setOpen] = useState<'ends' | 'topic' | 'details' | 'group' | null>(null);
  // The less-used settings (Election mode, votes can change, end time, details) wait behind "More options".
  const [showMore, setShowMore] = useState(false);
  // The poll-type row opens a list of the five types, each with one line on what it does.
  const [typeOpen, setTypeOpen] = useState(false);

  // Like a WhatsApp poll: typing in the last box adds the next empty one (up to 10), so there is no "add" step.
  const setChoice = (i: number, v: string) => {
    const grow = i === choices.length - 1 && v.trim() !== '' && choices.length < 10;
    setChoices((c) => [...c.map((x, j) => (j === i ? v : x)), ...(grow ? [''] : [])]);
    if (grow) {
      setEmojis((e) => [...e, '']);
      setTouched((d) => [...d, false]);
      setPhotos((x) => [...x, '']);
    }
  };
  const setPicture = (i: number, p: Picture) => {
    setEmojis((e) => e.map((x, j) => (j === i ? p.emoji.trim() : x)));
    setTouched((d) => d.map((x, j) => (j === i ? true : x)));
    setPhotos((x) => x.map((v, j) => (j === i ? p.photo : v)));
  };
  const removeChoice = (i: number) => {
    setChoices((x) => x.filter((_, j) => j !== i));
    setEmojis((x) => x.filter((_, j) => j !== i));
    setTouched((x) => x.filter((_, j) => j !== i));
    setPhotos((x) => x.filter((_, j) => j !== i));
  };
  const fill = (next: string[]) => {
    const list = [...next, ...(next.length < 10 ? [''] : [])];
    setChoices(list);
    setEmojis(list.map(() => ''));
    setTouched(list.map(() => false));
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
  const fromQuestion = typedChoices || kind === 'rating' ? null : choicesFromQuestion(title);
  const filledCount = choices.filter((c) => c.trim()).length;
  // The main button says what is still missing, then "Create duel".
  const buttonText = busy ? t.creating : title.trim().length < 3 ? t.needQuestion : !isRating && filledCount < 2 ? t.needChoices(2 - filledCount) : t.createDuel;
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
    } else if (filled.length < 2) errs.choices = t.errChoices;
    else if (new Set(filled.map((c) => c.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') || c)).size !== filled.length) errs.choices = t.errSame;
    if (endsAt && !(new Date(endsAt).getTime() > Date.now())) errs.end = t.errEnd;
    setFieldError(errs);
    if (errs.title) document.getElementById('title')?.focus();
    else if (errs.choices) document.querySelector<HTMLInputElement>('input[data-choice]')?.focus();
    else if (errs.end) {
      // The end time sits under "More options": open it so the message is seen.
      setOpen('ends');
      setTimeout(() => document.getElementById('end')?.focus(), 0);
    }
    return !errs.title && !errs.choices && !errs.end;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !check()) return;
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
        options: isRating ? RATING_LABELS : kept.map((x) => x.c),
        emojis: isRating ? RATING_EMOJIS : kept.map((x) => x.e),
        photos: isRating ? [] : kept.map((x) => x.p),
        hideUntilVoted,
        allowChange,
        electionMode,
        groupSize: isGroup ? groupN : undefined,
        photoConsent,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.id) {
      rememberMyPoll(data.id, data.manageKey);
      return router.push(`/p/${data.id}?new=1`);
    }
    setError(data?.error ? apiMsg(lang, data.error) : t.errGeneric);
    setBusy(false);
  }

  const TONES = ['input', 'feedback', 'control', 'agents', 'output', 'trust'];
  const toggleOpen = (k: 'ends' | 'topic' | 'details' | 'group') => setOpen((o) => (o === k ? null : k));
  const endsLabel = endsAt ? new Date(endsAt).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : t.setEnds;

  // Create, top to bottom (docs/DESIGN.md, "Create, tidied"): the question in a real box, the choices, then every
  // setting as one list of rows (the poll type first, the less-used ones behind "More options"). One main button.
  const TYPES = [
    { k: 'choice', Icon: CircleDot, name: t.typePickOne, desc: t.typeDesc.choice, pick: () => pickKind('choice') },
    { k: 'called', Icon: WandSparkles, name: t.formatCalled, desc: t.typeDesc.called, pick: () => pickKind('choice', true) },
    { k: 'multi', Icon: ListChecks, name: t.formatMulti, desc: t.typeDesc.multi, pick: () => pickKind('multi') },
    { k: 'rank', Icon: ListOrdered, name: t.formatRank, desc: t.typeDesc.rank, pick: () => pickKind('rank') },
    { k: 'rating', Icon: Smile, name: t.formatRate, desc: t.typeDesc.rating, pick: () => pickKind('rating') },
  ];
  const current = TYPES.find((x) => x.k === (calledIt ? 'called' : kind)) ?? TYPES[0];

  return (
    <form className="builder create" onSubmit={submit}>
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
          maxLength={120}
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
        {title.length >= 100 && <p className="small muted create-count" aria-live="polite">{t.charsLeft(120 - title.length)}</p>}
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
        <p className="create-label">{isRating ? t.formatRate : t.choicesTitle}</p>
        {isRating ? (
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
                      className={'face-pick' + (photos[i] ? ' has-photo' : emojiAt(i) ? (touched[i] ? ' has-emoji' : ' has-emoji is-auto') : '')}
                      aria-label={t.pictureN(i + 1)}
                      title={!touched[i] && !photos[i] && emojiAt(i) ? t.emojiAuto : undefined}
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
                      maxLength={60}
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

      {/* 3. Settings: one list of rows. Each says its current value; a row opens its own box underneath. */}
      <section className="create-block">
        <p className="create-label">{t.settingsLabel}</p>
        <ul className="al-listcard create-settings">
          <li>
            <Row icon={current.Icon} name={t.typeLabel} note={current.desc} value={current.name} open={typeOpen} tone="var(--p-input)" onClick={() => setTypeOpen((v) => !v)} />
            {typeOpen && (
              <div className="create-types" role="radiogroup" aria-label={t.typeLabel}>
                {TYPES.map((x) => (
                  <button key={x.k} type="button" role="radio" aria-checked={x.k === current.k} className={'create-type' + (x.k === current.k ? ' is-on' : '')} onClick={() => { x.pick(); setTypeOpen(false); }}>
                    <x.Icon size={18} strokeWidth={1.75} aria-hidden />
                    <span><strong>{x.name}</strong><span className="small muted">{x.desc}</span></span>
                    {x.k === current.k && <Check size={16} strokeWidth={2.25} aria-hidden />}
                  </button>
                ))}
              </div>
            )}
          </li>
          <li><Row icon={EyeOff} name={t.setHidden} note={t.hideResultsNote} on={hideUntilVoted} onClick={() => setHide((v) => !v)} /></li>
          <li>
            <Row icon={Tag} name={t.category} value={t.categories[category] ?? category} open={open === 'topic'} onClick={() => toggleOpen('topic')} />
            {open === 'topic' && (
              <div className="create-panel row wrap" role="radiogroup" aria-label={t.category}>
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={category === c} className={'chip' + (category === c ? ' chip-on' : '')} onClick={() => { setCategory(c); setOpen(null); }}>
                    {t.categories[c] ?? c}
                  </button>
                ))}
              </div>
            )}
          </li>
          {showMore || endsAt || isGroup || allowChange || electionMode || description.trim() || fieldError.end ? (
            <>
              <li>
                <Row icon={Clock} name={t.setEnds} value={endsAt ? endsLabel : t.offWord} open={open === 'ends' || !!fieldError.end} onClick={() => toggleOpen('ends')} />
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
                <Row icon={Users} name={t.setGroup} value={isGroup ? String(groupN) : t.offWord} open={open === 'group'} onClick={() => toggleOpen('group')} />
                {open === 'group' && (
                  <div className="create-panel">
                    <span className="search">
                      <Users size={14} strokeWidth={1.75} aria-hidden />
                      <input id="group" type="number" inputMode="numeric" min={2} max={200} value={groupSize} placeholder="12" aria-label={t.grpHow} onChange={(e) => setGroupSize(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </span>
                    <p className="small muted">{t.grpHow} {t.grpNote}</p>
                  </div>
                )}
              </li>
              <li><Row icon={Repeat} name={t.setChange} note={t.allowChangeNote} on={allowChange} onClick={() => setChange((v) => !v)} /></li>
              <li><Row icon={Landmark} name={t.setElection} note={t.setElectionShort} on={electionMode} onClick={() => setElectionMode((v) => !v)} /></li>
              <li>
                <Row icon={AlignLeft} name={t.setDetails} value={description.trim() ? '✓' : t.offWord} open={open === 'details'} onClick={() => toggleOpen('details')} />
                {open === 'details' && (
                  <div className="create-panel">
                    <span className="search">
                      <input id="desc" enterKeyHint="done" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setOpen(null))} value={description} maxLength={300} placeholder={t.detailsPh} aria-label={t.details} onChange={(e) => setDescription(e.target.value)} />
                    </span>
                  </div>
                )}
              </li>
            </>
          ) : (
            <li><Row icon={SlidersHorizontal} name={t.moreOptions} open={false} onClick={() => setShowMore(true)} /></li>
          )}
        </ul>
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
          consent={photoConsent}
          onConsent={setPhotoConsent}
        />
      )}
      {/* The one main step, pinned at thumb height on phones (like Next on a duel). */}
      <div className="builder-go">
        <button className={'btn btn-primary btn-lg' + (title.trim().length >= 3 && (isRating || filledCount >= 2) ? ' is-ready' : '')} disabled={busy}>{buttonText}</button>
      </div>
    </form>
  );
}
