import { Plus } from 'lucide-react';
import { AVATARS } from '@/lib/avatars';
import type { Dict } from '@/lib/i18n';

// "How many people have been here", at the bottom of Home (owner, Oct 2026: "three avatars, then a plus, then the
// number"). The faces are the ones a profile can pick, as decoration only: they are not the real visitors (nobody's
// face or name is ever shown here). One face per visitor up to three; the "+" joins them once there are more.
const FACES = AVATARS.slice(0, 3);

export default function PeopleCount({ seen, voted, fmt, t }: { seen: number; voted: number | null; fmt: (n: number) => string; t: Dict }) {
  const faces = FACES.slice(0, Math.min(seen, FACES.length));
  return (
    <section className="people-count">
      <span className="people-faces" aria-hidden>
        {faces.map((f) => <span key={f} className="people-face">{f}</span>)}
        {seen > FACES.length && <span className="people-face people-more"><Plus size={16} strokeWidth={2.5} /></span>}
      </span>
      <p className="people-text">
        <span><strong className="people-n">{fmt(seen)}</strong> {t.peopleVisited(seen === 1)}</span>
        {voted !== null && <span className="people-sub">{t.peopleVotedToo(fmt(voted))}</span>}
      </p>
    </section>
  );
}
