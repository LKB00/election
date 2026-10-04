'use client';
import { Hash, Share2, Sparkles, Users } from 'lucide-react';
import { useLang, useT } from '@/lib/lang';
import type { MonthView } from '@/lib/month';
import { topicIcon } from '@/lib/topicIcons';

// "Your month in opinions" (docs/DESIGN.md, "Month card"): a type word (P1), then what it rests on (P2), then share.
// Yellow = you. It describes how you voted; it never ranks you or compares you with anyone.
export default function MonthCard({ m }: { m: MonthView }) {
  const t = useT();
  const lang = useLang();
  const month = new Date(m.monthStart).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });
  const type = m.type ? t.monthTypes[m.type] : null;
  const TopicIcon = m.topCategory ? topicIcon(m.topCategory) : null;
  const text = t.monthShareText(month, type ? type[0] : t.monthPolls(m.polls), m.withCrowd, m.judged, m.grid);
  async function share() {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener');
  }
  return (
    <section className="month-card" aria-label={t.monthTitle(month)}>
      <p className="label">{t.monthTitle(month)}</p>
      {type && (
        <>
          <p className="month-card__type"><Sparkles size={22} strokeWidth={2} aria-hidden /> {type[0]}</p>
          <p className="month-card__line">{type[1]}</p>
        </>
      )}
      {m.grid && <p className="month-card__grid" aria-hidden>{m.grid}</p>}
      <ul className="month-card__facts">
        <li><Hash size={16} strokeWidth={1.75} aria-hidden /> {t.monthPolls(m.polls)}</li>
        {m.judged > 0 && <li><Users size={16} strokeWidth={1.75} aria-hidden /> {t.monthCrowd(m.withCrowd, m.judged)}</li>}
        {m.rarest && <li><Sparkles size={16} strokeWidth={1.75} aria-hidden /> {t.monthRare(m.rarest.pick, m.rarest.pct, m.rarest.title)}</li>}
        {m.topCategory && TopicIcon && <li><TopicIcon size={16} strokeWidth={1.75} aria-hidden /> {t.monthTopic(t.categories[m.topCategory] ?? m.topCategory)}</li>}
      </ul>
      <button type="button" className="btn btn-primary" onClick={share}><Share2 size={14} strokeWidth={1.75} aria-hidden /> {t.monthShare}</button>
      <p className="small muted">{t.monthNote}</p>
    </section>
  );
}
