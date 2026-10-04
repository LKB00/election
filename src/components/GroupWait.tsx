'use client';
import { Share2, Users } from 'lucide-react';
import { useT } from '@/lib/lang';

// A group poll waiting for its group (docs/DESIGN.md, "Group polls"): one dot per person, filled as they vote
// ("7 of 12 voted"), and the one useful action while you wait: remind the group. Results open for everyone together.
export default function GroupWait({ pollId, title, voted, of, mine }: { pollId: string; title: string; voted: number; of: number; mine: boolean }) {
  const t = useT();
  async function remind() {
    const url = `${window.location.origin}/p/${pollId}`;
    const text = t.grpRemindText(title, voted, of);
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener');
  }
  const dots = Math.min(of, 60);
  const filled = Math.round((Math.min(voted, of) / of) * dots);
  return (
    <div className="group-wait" aria-live="polite">
      <p className="group-wait__count"><Users size={16} strokeWidth={1.75} aria-hidden /> <strong>{t.grpVoted(voted, of)}</strong></p>
      <div className="group-wait__dots" role="img" aria-label={t.grpVoted(voted, of)}>
        {Array.from({ length: dots }, (_, n) => <span key={n} className={n < filled ? 'is-in' : undefined} />)}
      </div>
      <p className="small muted">{mine ? t.grpWaitYou : t.grpWait}</p>
      {mine && <button type="button" className="btn btn-ghost" onClick={remind}><Share2 size={14} strokeWidth={1.75} aria-hidden /> {t.grpRemind}</button>}
    </div>
  );
}
