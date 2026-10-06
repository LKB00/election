'use client';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PreviewCard, { previewRules, type PreviewChoice } from './PreviewCard';
import { useT } from '@/lib/lang';
import { useOverlay } from '@/lib/useOverlay';

// "See how it looks" (docs/DESIGN.md, "Preview before posting"): the poll drawn the way a voter first meets it, with
// the same ballot parts as the poll page (question, choices with their faces, the Vote keys), before it is posted.
// Choices cannot change after the first vote, so this is the moment to catch a typo. One main button: Post.

export default function CreatePreview({
  title, description, kind, calledIt, group, electionMode, hideUntilVoted, ends, choices, rateWords, rateEmojis, other, postLabel, busy, onPost, onClose,
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
  other?: boolean;
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

  const rules = previewRules(t, hideUntilVoted, group, ends);

  return createPortal(
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="sheet preview-sheet" role="dialog" aria-modal="true" aria-label={t.previewTitle}>
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label={t.close}><X size={18} strokeWidth={2} aria-hidden /></button>
        <p className="label preview-eyebrow">{t.previewTitle}</p>
        {/* What a voter sees: not tappable here (aria-hidden), the words are read out once below. */}
        <PreviewCard poll={{ title, description, kind, calledIt, group, electionMode, choices, rateWords, rateEmojis, other }} t={t} />
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
