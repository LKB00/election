import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Dict, Lang } from '@/lib/i18n';
import type { PackSummary } from '@/lib/packs';

// "Tonight" on Home: the match-day and show-night packs about to start (or just started), as Arogya list rows.
export default function PackRows({ packs, t, lang }: { packs: PackSummary[]; t: Dict; lang: Lang }) {
  return (
    <ul className="al-listcard">
      {packs.map((p) => {
        const started = new Date(p.startsAt).getTime() <= Date.now();
        const when = new Date(p.startsAt).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
        return (
          <li key={p.id}>
            <Link href={`/pack/${p.id}`} className="al-row">
              <span className="al-row__disc is-faces" style={{ '--tone': p.kind === 'match' ? 'var(--p-control)' : 'var(--p-feedback)' } as React.CSSProperties} aria-hidden>{p.kind === 'match' ? '🏏' : '📺'}</span>
              <span className="al-row__main">
                <span className="al-row__title">{p.title}</span>
                <span className="al-row__meta">{p.kind === 'match' ? t.packMatch : t.packShow} · {started ? t.packStarted : t.packCloses(when)}</span>
              </span>
              <span className="al-row__when"><span>{t.pollsN(p.polls)}</span></span>
              <ChevronRight size={18} strokeWidth={1.75} className="al-row__chevron" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
