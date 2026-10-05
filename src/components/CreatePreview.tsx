'use client';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { faceLabels } from '@/lib/labels';
import { useT } from '@/lib/lang';
import { useOverlay } from '@/lib/useOverlay';

// "See how it looks" (docs/DESIGN.md, "Preview before posting"): the poll drawn the way a voter first meets it, with
// the same ballot parts as the poll page (question, choices with their faces, the Vote keys), before it is posted.
// Choices cannot change after the first vote, so this is the moment to catch a typo. One main button: Post.
const TONES = ['input', 'feedback', 'control', 'agents', 'output', 'trust'];

export type PreviewChoice = { label: string; emoji: string; photo: string };

export default function CreatePreview({
  title, description, kind, calledIt, group, electionMode, hideUntilVoted, ends, choices, rateWords, rateEmojis, postLabel, busy, onPost, onClose,
}: {
  title: string;
  description: string;
  kind: 'choice' | 'multi' | 'rank' | 'rating' | 'dates';
  calledIt: boolean;
  group: number | null;
  electionMode: boolean;
  hideUntilVoted: boolean;
  /** When it ends, in words (or null for no end time). */
  ends: string | null;
  choices: PreviewChoice[];
  rateWords: string[];
  rateEmojis: string[];
  postLabel: string;
  busy: boolean;
  onPost: () => void;
  onClose: () => void;
}) {
  const t = useT();
  useOverlay(onClose, { back: true });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('.btn-primary')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  const dates = kind === 'dates';
  const letters = dates ? choices.map((c) => /\d{1,2}/.exec(c.label)?.[0] ?? '📅') : faceLabels(choices.map((c) => c.label));
  const key = dates ? t.datesTap : kind === 'multi' ? t.multiTick : kind === 'rank' ? t.rankNext(1) : t.vote;
  const rules = [hideUntilVoted ? t.previewHidden : t.previewOpen, group ? t.previewGroup(group) : '', ends ? t.previewEnds(ends) : ''].filter(Boolean).join(' · ');

  return createPortal(
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="sheet preview-sheet" role="dialog" aria-modal="true" aria-label={t.previewTitle}>
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label={t.close}><X size={18} strokeWidth={2} aria-hidden /></button>
        <p className="label preview-eyebrow">{t.previewTitle}</p>
        {/* What a voter sees: not tappable here (aria-hidden), the words are read out once below. */}
        <div className="preview-card" aria-hidden>
          {group ? <p className="label duel-today">👥 {t.grpLabel}</p> : calledIt ? <p className="label duel-today">🔮 {t.calledLabel}</p> : null}
          <p className="display duel-q">{title}</p>
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
                <div key={n} className="tot-option duel-option" style={{ '--pc': `var(--p-${TONES[n % TONES.length]})`, '--dc': `var(--d-${TONES[n % TONES.length]})` } as React.CSSProperties}>
                  {electionMode && <span className="tot-letter">{n + 1}</span>}
                  <span className="duel-body">
                    {c.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <span className={`duel-photo tone-${TONES[n % TONES.length]}`}><img src={c.photo} alt="" /></span>
                    ) : (
                      <span className={`duel-face tone-${TONES[n % TONES.length]}` + (c.emoji ? ' has-emoji' : '')}><span>{c.emoji || letters[n]}</span></span>
                    )}
                    <span className="duel-text"><span className="duel-name">{c.label}</span></span>
                  </span>
                  <span className="evm-row"><span className="evm-led" /><span className="evm-btn">{key}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="sr-only">{[title, description, ...choices.map((c) => c.label)].filter(Boolean).join('. ')}</p>
        <p className="small muted preview-rules">{rules}</p>
        {kind !== 'rating' && <p className="small preview-lock">{t.previewLock}</p>}
        <div className="preview-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={onPost} disabled={busy}>{postLabel}</button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>{t.previewEdit}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
