'use client';
import { useRouter } from 'next/navigation';
import { Clock, Landmark, EyeOff, ImagePlus, Lightbulb, Repeat, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { useLang, useT } from '@/lib/lang';
import { apiMsg } from '@/lib/i18n';
import { choicesFromQuestion, emojiFor } from '@/lib/createHelp';
import { RATING_EMOJIS, RATING_LABELS, type PollKind } from '@/lib/rating';
import PicturePicker, { type Picture } from './PicturePicker';

export default function CreateForm({ initialTitle = '' }: { initialTitle?: string }) {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('general');
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
  // Election mode: the full booth ritual for this poll. Politics polls get it anyway (the server decides that).
  const [electionMode, setElectionMode] = useState(false);
  // "I am 18+, and these photos are me or people who said yes": ticked once in the picture sheet, before any photo.
  const [photoConsent, setPhotoConsent] = useState(false);
  // What kind of question: pick one of your choices, or rate it 1–5 with faces.
  const [kind, setKind] = useState<PollKind>('choice');
  const isRating = kind === 'rating';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Errors show under the field they belong to, and focus moves there.
  const [fieldError, setFieldError] = useState<{ title?: string; choices?: string; end?: string }>({});
  // P3 settings are one line of chips; each opens its small box underneath, one at a time.
  const [open, setOpen] = useState<'ends' | 'topic' | 'details' | null>(null);

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
        options: isRating ? RATING_LABELS : kept.map((x) => x.c),
        emojis: isRating ? RATING_EMOJIS : kept.map((x) => x.e),
        photos: isRating ? [] : kept.map((x) => x.p),
        hideUntilVoted,
        allowChange,
        electionMode,
        photoConsent,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.id) return router.push(`/p/${data.id}?new=1`);
    setError(data?.error ? apiMsg(lang, data.error) : t.errGeneric);
    setBusy(false);
  }

  const TONES = ['input', 'feedback', 'control', 'agents', 'output', 'trust'];
  const toggleOpen = (k: 'ends' | 'topic' | 'details') => setOpen((o) => (o === k ? null : k));
  const endsLabel = endsAt ? new Date(endsAt).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : t.setEnds;

  // Not a form: you build the ballot itself (docs/DESIGN.md, "Create: build the ballot"). The question is the big title,
  // each choice is a ballot row (number, picture, name, the blue Vote key); what you see is what voters get.
  return (
    <form className="builder" onSubmit={submit}>
      {/* P3: ideas, only on an empty ballot (a blank page is the hardest part). */}
      {!title.trim() && !typedChoices && (
        <div className="duel-group">
          <span className="label"><Lightbulb size={12} strokeWidth={1.75} aria-hidden /> {t.ideasLabel}</span>
          <div className="create-ideas">
            {t.ideas.map((it, n) => (
              <button key={n} type="button" className="chip" onClick={() => idea(n)}>{it.q}</button>
            ))}
            <button type="button" className="chip" onClick={() => fill([t.yes, t.no])}>{t.starterYesNo}</button>
          </div>
        </div>
      )}

      <section className="tot builder-ballot" aria-label={t.ballotLabel}>
        <p className="label">{t.ballotLabel}</p>
        {/* What kind of question (P2): your own choices, or a 1–5 rating with faces. */}
        <div className="builder-kind" role="radiogroup" aria-label={t.ballotLabel}>
          <button type="button" role="radio" aria-checked={kind === 'choice'} className={'chip' + (kind === 'choice' ? ' chip-on' : '')} onClick={() => setKind('choice')}>☑️ {t.formatChoice}</button>
          <button type="button" role="radio" aria-checked={kind === 'multi'} className={'chip' + (kind === 'multi' ? ' chip-on' : '')} onClick={() => setKind('multi')}>✅ {t.formatMulti}</button>
          <button type="button" role="radio" aria-checked={kind === 'rank'} className={'chip' + (kind === 'rank' ? ' chip-on' : '')} onClick={() => setKind('rank')}>🔢 {t.formatRank}</button>
          <button type="button" role="radio" aria-checked={isRating} className={'chip' + (isRating ? ' chip-on' : '')} onClick={() => setKind('rating')}>😍 {t.formatRate}</button>
        </div>
        <textarea
          id="title"
          className="display builder-q"
          rows={1}
          enterKeyHint="next"
          autoCapitalize="sentences"
          autoComplete="off"
          value={title}
          maxLength={120}
          placeholder={t.questionPh}
          aria-label={t.yourQuestion}
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
        {!title.trim() && !typedChoices && <p className="small muted builder-hint">{t.builderHint}</p>}

        {isRating ? (
          <>
            <div className="rate-scale is-preview" aria-hidden>
              {RATING_EMOJIS.map((e, n) => (
                <span key={e} className="rate-step"><span className="rate-step-face">{e}</span><span className="rate-step-word">{t.rateWords[n]}</span></span>
              ))}
            </div>
            <p className="small muted builder-hint">{t.rateHint}</p>
          </>
        ) : (
        <div className="tot-options duel-options is-ballot builder-rows">
          {choices.map((c, i) => {
            const isNew = i === choices.length - 1 && !c.trim() && choices.length > 2;
            return (
              <div
                key={i}
                className={'tot-option duel-option builder-row' + (isNew ? ' is-new' : '')}
                style={{ '--pc': `var(--p-${TONES[i % TONES.length]})` } as React.CSSProperties}
              >
                <span className="tot-letter">{i + 1}</span>
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
                <span className="evm-row">
                  {choices.length > 2 && !isNew ? (
                    <button type="button" className="icon-btn builder-remove" aria-label={t.removeChoice(i + 1)} onClick={() => removeChoice(i)}>
                      <X size={14} strokeWidth={1.75} aria-hidden />
                    </button>
                  ) : (
                    <span className="evm-led" aria-hidden />
                  )}
                  <span className="evm-btn" aria-hidden>{t.vote}</span>
                </span>
              </div>
            );
          })}
        </div>
        )}
        {kind === 'multi' && <p className="small muted builder-hint">{t.multiHint}</p>}
        {kind === 'rank' && <p className="small muted builder-hint">{t.rankHint}</p>}
        {fieldError.choices && <p className="field-error" role="alert">{fieldError.choices}</p>}
      </section>

      {/* P3 settings as one line of chips: tap to switch, or to open its small box underneath. */}
      <div className="builder-settings" role="group" aria-label={t.moreOptions}>
        <button type="button" className={'chip' + (hideUntilVoted ? ' chip-on' : '')} aria-pressed={hideUntilVoted} title={t.hideResultsNote} onClick={() => setHide((v) => !v)}>
          <EyeOff size={13} strokeWidth={1.75} aria-hidden /> {t.setHidden}
        </button>
        <button type="button" className={'chip' + (electionMode ? ' chip-on' : '')} aria-pressed={electionMode} title={t.setElectionNote} onClick={() => setElectionMode((v) => !v)}>
          <Landmark size={13} strokeWidth={1.75} aria-hidden /> {t.setElection}
        </button>
        <button type="button" className={'chip' + (allowChange ? ' chip-on' : '')} aria-pressed={allowChange} title={t.allowChangeNote} onClick={() => setChange((v) => !v)}>
          <Repeat size={13} strokeWidth={1.75} aria-hidden /> {t.setChange}
        </button>
        <button type="button" className={'chip' + (endsAt ? ' chip-on' : '')} aria-expanded={open === 'ends'} onClick={() => toggleOpen('ends')}>
          <Clock size={13} strokeWidth={1.75} aria-hidden /> <span suppressHydrationWarning>{endsLabel}</span>
        </button>
        <button type="button" className="chip" aria-expanded={open === 'topic'} onClick={() => toggleOpen('topic')}>
          {t.setTopic(t.categories[category] ?? category)}
        </button>
        <button type="button" className={'chip' + (description.trim() ? ' chip-on' : '')} aria-expanded={open === 'details'} onClick={() => toggleOpen('details')}>
          {t.setDetails}
        </button>
      </div>
      {electionMode && <p className="small muted builder-note">{t.setElectionNote}</p>}
      {(open === 'ends' || fieldError.end) && (
        <div className="duel-group">
          <span className="search">
            <Clock size={14} strokeWidth={1.75} aria-hidden />
            <input id="end" type="datetime-local" min={localNow()} value={endsAt} aria-label={t.ends} aria-invalid={!!fieldError.end} onChange={(e) => { setEndsAt(e.target.value); setFieldError((f) => ({ ...f, end: undefined })); }} />
          </span>
          {endsAt && <button type="button" className="link-like small muted" onClick={() => setEndsAt('')}>{t.endsClear}</button>}
          {fieldError.end && <p className="field-error" role="alert">{fieldError.end}</p>}
        </div>
      )}
      {open === 'topic' && (
        <div className="row wrap" role="radiogroup" aria-label={t.category}>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={category === c} className={'chip' + (category === c ? ' chip-on' : '')} onClick={() => { setCategory(c); setOpen(null); }}>
              {t.categories[c] ?? c}
            </button>
          ))}
        </div>
      )}
      {open === 'details' && (
        <span className="search">
          <input id="desc" enterKeyHint="done" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setOpen(null))} value={description} maxLength={300} placeholder={t.detailsPh} aria-label={t.details} onChange={(e) => setDescription(e.target.value)} />
        </span>
      )}

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
