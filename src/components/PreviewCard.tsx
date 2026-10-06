import { faceLabels } from '@/lib/labels';
import type { Dict } from '@/lib/i18n';

// The poll drawn the way a voter first meets it (question, choices with their faces, the Vote keys), before it is
// posted. Used by the "See how it looks" sheet and, on desktop, by the live preview beside the Create form.
// Not tappable (aria-hidden): the words are read out once, separately.
const TONES = ['input', 'feedback', 'control', 'agents', 'output', 'trust'];

export type PreviewChoice = { label: string; emoji: string; photo: string };
export type PreviewPoll = {
  title: string;
  description: string;
  kind: 'choice' | 'multi' | 'rank' | 'rating' | 'dates';
  calledIt: boolean;
  group: number | null;
  electionMode: boolean;
  choices: PreviewChoice[];
  rateWords: string[];
  rateEmojis: string[];
  /** "Other (write your own)" at the end of the ballot. */
  other?: boolean;
};

// The poll's rules in one quiet line under the card: who sees results when, and when it ends.
export function previewRules(t: Dict, hideUntilVoted: boolean, group: number | null, ends: string | null): string {
  return [hideUntilVoted ? t.previewHidden : t.previewOpen, group ? t.previewGroup(group) : '', ends ? t.previewEnds(ends) : ''].filter(Boolean).join(' · ');
}

export default function PreviewCard({ poll, t, live = false }: { poll: PreviewPoll; t: Dict; /** Desktop live preview: empty parts show as faint placeholders. */ live?: boolean }) {
  const { title, description, kind, calledIt, group, electionMode, rateWords, rateEmojis } = poll;
  // Live preview while typing: an empty question or fewer than two choices show their placeholders, so the shape is there.
  let choices: (PreviewChoice & { ph?: boolean })[] = live && kind !== 'dates' && poll.choices.length < 2
    ? [...poll.choices, ...Array.from({ length: 2 - poll.choices.length }, (_, n) => ({ label: t.choiceN(poll.choices.length + n + 1), emoji: '', photo: '', ph: true }))]
    : poll.choices;
  // "Other (write your own)" sits last, after the placeholders, as on the real ballot.
  if (poll.other && kind === 'choice') choices = [...choices, { label: t.otherChoice, emoji: '✍️', photo: '' }];
  const dates = kind === 'dates';
  const letters = dates ? choices.map((c) => /\d{1,2}/.exec(c.label)?.[0] ?? '📅') : faceLabels(choices.map((c) => c.label));
  const key = dates ? t.datesTap : kind === 'multi' ? t.multiTick : kind === 'rank' ? t.rankNext(1) : t.vote;
  return (
    <div className={'preview-card' + (live ? ' is-live' : '')} aria-hidden>
      {group ? <p className="label duel-today">👥 {t.grpLabel}</p> : calledIt ? <p className="label duel-today">🔮 {t.calledLabel}</p> : null}
      <p className={'display duel-q' + (title ? '' : ' is-ph')}>{title || (calledIt ? t.calledPh : t.questionPh)}</p>
      {description && <p className="small muted duel-desc">{description}</p>}
      <p className="small muted"><span className="live-dot" /> {t.pollingOpen} · {t.beFirst}</p>
      {kind === 'rating' ? (
        <div className="rate-scale is-preview">
          {rateEmojis.map((e, n) => (
            <span key={e} className="rate-step"><span className="rate-step-face">{e}</span><span className="rate-step-word">{rateWords[n]}</span></span>
          ))}
        </div>
      ) : (
        <div className={'tot-options duel-options n-' + choices.length + (choices.length >= 3 ? ' is-ballot' : '') + (electionMode ? ' is-election' : ' no-num')}>
          {choices.map((c, n) => (
            <div key={n} className={'tot-option duel-option' + ('ph' in c ? ' is-ph' : '')} style={{ '--pc': `var(--p-${TONES[n % TONES.length]})`, '--dc': `var(--d-${TONES[n % TONES.length]})` } as React.CSSProperties}>
              {electionMode && <span className="tot-letter">{n + 1}</span>}
              <span className="duel-body">
                {c.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <span className={`duel-photo tone-${TONES[n % TONES.length]}`}><img src={c.photo} alt="" /></span>
                ) : (
                  <span className={`duel-face tone-${TONES[n % TONES.length]}` + (c.emoji ? ' has-emoji' : '')}><span>{'ph' in c ? '' : c.emoji || letters[n]}</span></span>
                )}
                <span className="duel-text"><span className="duel-name">{c.label}</span></span>
              </span>
              <span className="evm-row"><span className="evm-led" /><span className="evm-btn">{key}</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
