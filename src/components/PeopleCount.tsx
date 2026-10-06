import { Plus } from 'lucide-react';
import { AVATARS } from '@/lib/avatars';
import type { Dict } from '@/lib/i18n';

// "How many times this site was looked at", at the bottom of Home (owner, Oct 2026: "three avatars, then a plus, then
// the number", "make it subtle", "show views, the number big"). The faces are the ones a profile can pick, as decoration
// only: they are not real visitors (nobody's face or name is ever shown here).
const FACES = AVATARS.slice(0, 3);

export default function PeopleCount({ views, voted, fmt, t }: { views: number; voted: number | null; fmt: (n: number) => string; t: Dict }) {
  return (
    <section className="people-count">
      <span className="people-faces" aria-hidden>
        {FACES.map((f) => <span key={f} className="people-face">{f}</span>)}
        <span className="people-face people-more"><Plus size={12} strokeWidth={2.5} /></span>
      </span>
      <strong className="people-n">{fmt(views)}</strong>
      <span className="people-text">
        <span>{t.views(views === 1)}</span>
        {voted !== null && <span className="people-sub">{t.peopleVotedToo(fmt(voted))}</span>}
      </span>
    </section>
  );
}
