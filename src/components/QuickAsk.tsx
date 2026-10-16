'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import Spot from './Spot';
import { apiMsg } from '@/lib/i18n';
import { useLang, useT } from '@/lib/lang';
import { choicesFromQuestion, choiceTopic, emojiFor } from '@/lib/createHelp';
import { MAX_TITLE, MILESTONES, RECENT_VOTES_MIN } from '@/lib/limits';
import { track } from '@/lib/track';
import { rememberMyPoll } from './MyPolls';
// Loaded only when someone needs to sign in.
const SignInSheet = dynamic(() => import('./SignIn'), { ssr: false });

type Idea = { q: string; c: string[] };
type Today = { id: string; title: string; n: number; total?: number };
/** An unfinished question stays on this phone (only here), so it is there next time. */
const DRAFT = 'chunav-ask-draft';
// Home can hold two ask cards (under the poll, and at the end of today's polls): count a returning question once.
let draftCounted = false;

// "Ask anything" (docs/DESIGN.md, "More people asking"): a question box right where people vote, so starting a poll
// is one line, not a separate screen. Choices are read out of the question ("Chai or coffee?" → Chai / Coffee) and
// shown before posting; a question without them goes on to Create with the words filled in. Ideas (the person picks
// one) fill the box. Posting needs a profile, asked for only at Post. The poll is theirs; the site never posts one.
export default function QuickAsk({ ideas = [], category = 'general', heading, signedIn, recentVotes = 0, mine, popular }: { ideas?: Idea[]; category?: string; /** "Your turn: ask something" when someone ran out of polls. */ heading?: string; signedIn?: boolean; /** Votes on the site in the last day: proof that questions here get answered. */ recentVotes?: number; /** Your own poll's new votes today (Home, signed in). */ mine?: Today | null; /** One public poll that took off today. */ popular?: Today | null }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [text, setText] = useState('');
  const box = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Idea | null>(null);
  // Unknown (a page that does not look it up): try, and ask to sign in only if the server says so.
  const [signed, setSigned] = useState(signedIn ?? true);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Catches the eye while the box is empty: example questions take turns in it (not while you type, not with less motion).
  const examples = useMemo(() => Object.values(t.ideaSets).flat().map((i) => i.q), [t]);
  const [ex, setEx] = useState(0);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (focused || text || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setEx((n) => (n + 1) % examples.length), 2600);
    return () => clearInterval(id);
  }, [focused, text, examples.length]);
  const title = text.trim();
  // A milestone (10, 50, 100…) crossed today says more than "12 new votes".
  const reached = mine?.total ? MILESTONES.filter((m) => mine.total! >= m && mine.total! - mine.n < m).pop() : undefined;
  // "Finish your question?": what was typed and not posted comes back (kept on this phone only).
  const [draft, setDraft] = useState(false);
  const draftUsed = useRef(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT);
      if (saved) {
        setText(saved);
        setDraft(true);
        draftUsed.current = true;
        if (!draftCounted) track('draft_back');
        draftCounted = true;
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (title) localStorage.setItem(DRAFT, text);
      else localStorage.removeItem(DRAFT);
    } catch {}
  }, [text, title]);
  // An idea keeps its own choices (some list three names); typed questions are read for "A or B".
  const choices = picked && picked.q === title ? picked.c : choicesFromQuestion(title);
  const ready = title.length >= 3 && !!choices;
  // No "or" in it: ready choices for what it is about ("Best Diwali sweet?" → Kaju katli, Gulab jamun…), one tap to use.
  const suggested = !choices && title.length >= 3 ? t.choiceSets[choiceTopic(title) ?? ''] : undefined;
  const createHref = `/create${title ? `?title=${encodeURIComponent(title)}` : ''}`;

  function post() {
    if (!ready || !choices) return;
    if (!signed) return setAsk(true);
    send();
  }
  async function send() {
    if (!ready || !choices) return;
    setBusy(true);
    setError('');
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ via: 'ask', title: title.endsWith('?') ? title : `${title}?`, options: choices, emojis: choices.map((c) => emojiFor(c) || ''), kind: 'choice', category }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.id) {
      rememberMyPoll(data.id, data.manageKey);
      if (draftUsed.current) track('draft_posted');
      try {
        localStorage.removeItem(DRAFT);
      } catch {}
      return router.push(`/p/${data.id}/manage?new=1`);
    }
    setBusy(false);
    if (res?.status === 401) {
      setSigned(false);
      return setAsk(true);
    }
    setError(data?.error ? apiMsg(lang, data.error) : t.errGeneric);
  }

  return (
    <section className="quick-ask" aria-label={heading ?? t.askTitle}>
      {/* Brand yellow (yours to ask), a picture, the promise in big words, and proof that people answer here. */}
      {/* Yours (yellow = you): how your own poll did today, one tap to its page. A reason to ask another. */}
      {mine && (
        <Link href={`/p/${mine.id}/manage`} className="quick-ask__mine">
          <TrendingUp size={18} strokeWidth={2} aria-hidden />
          <span className="quick-ask__mine-text">
            <strong>{reached ? t.askMineReached(reached) : t.askMine(mine.n)}</strong>
            <span className="small">“{mine.title}”</span>
          </span>
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Link>
      )}
      <div className="quick-ask__head">
        <span className="quick-ask__pic" aria-hidden><Spot kind="pen" size={46} /></span>
        <div>
          <h2 className="quick-ask__title">{heading ?? t.askTitle}</h2>
          {/* The truest proof first: a real poll that took off today, else today's vote count, else the plain promise. */}
          <p className="quick-ask__line">
            {popular ? <Link href={`/p/${popular.id}`} className="quick-ask__popular">{t.askPopular(popular.title, popular.n)}</Link> : recentVotes >= RECENT_VOTES_MIN ? t.askProof(recentVotes) : t.askEasy}
          </p>
        </div>
      </div>
      <form
        className="quick-ask__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) post();
          else if (title) router.push(createHref);
          else box.current?.focus();
        }}
      >
        <input
          ref={box}
          className="input"
          value={text}
          maxLength={MAX_TITLE}
          enterKeyHint="send"
          placeholder={examples[ex] ?? t.askPh}
          aria-label={heading ?? t.askTitle}
          onFocus={() => (setFocused(true), track('create_open'))}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setText(e.target.value);
            setDraft(false);
            setError('');
          }}
        />
        <button className="btn quick-ask__go" disabled={busy}>{ready || !title ? t.askPost : t.askNext}</button>
      </form>
      {draft && title && <p className="small quick-ask__draft">{t.draftBack}</p>}
      {/* What will be posted, before it is: the choices read from the question. */}
      {ready && choices && (
        <p className="small quick-ask__choices">
          <span>{t.askChoices}</span> {choices.map((c) => <span key={c} className="quick-ask__choice">{emojiFor(c)} {c}</span>)}
        </p>
      )}
      {suggested ? (
        <div className="quick-ask__ideas">
          <span className="small">{t.askSuggest}</span>
          <button type="button" className="quick-ask__idea quick-ask__suggest" onClick={() => setPicked({ q: title, c: suggested })}>
            {suggested.map((c) => `${emojiFor(c) ? emojiFor(c) + ' ' : ''}${c}`).join(' · ')}
          </button>
          <span className="small">{t.askNoChoices}</span>
        </div>
      ) : (
        title.length >= 3 && !ready && <p className="small">{t.askNoChoices}</p>
      )}
      {/* Ideas the person can pick (never posted for them): only while the box is empty. */}
      {!title && ideas.length > 0 && (
        <div className="quick-ask__ideas">
          <span className="small">{t.askIdeas}</span>
          <div className="row wrap">
            {ideas.slice(0, 3).map((i) => (
              <button key={i.q} type="button" className="quick-ask__idea" onClick={() => (setText(i.q), setPicked(i))}>
                <span aria-hidden>{i.c.map((c) => emojiFor(c)).filter(Boolean).slice(0, 2).join('') || (category === 'politics' ? '🗳️' : '💬')}</span> {i.q}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      <Link href={createHref} className="text-link small quick-ask__more">{t.askMore} <ArrowRight size={13} strokeWidth={2} aria-hidden /></Link>
      {ask && (
        <SignInSheet
          onClose={() => setAsk(false)}
          onDone={() => {
            setAsk(false);
            setSigned(true);
            send();
          }}
        />
      )}
    </section>
  );
}
