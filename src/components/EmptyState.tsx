import Link from 'next/link';
import Spot, { type SpotKind } from './Spot';

// Every empty page has the same three parts (docs/DESIGN.md, "Empty states"): a drawn picture, one line that says
// what is missing and why it matters, and the one next step. Never a blank space or a bare "nothing here".
export default function EmptyState({ kind = 'list', picture, title, line, action }: { kind?: SpotKind; /** A picture of its own (a topic's), instead of a drawn spot. */ picture?: React.ReactNode; title: string; line?: string; action?: { href: string; label: string } }) {
  return (
    <div className="spot-empty">
      {picture ?? <Spot kind={kind} />}
      <p><strong>{title}</strong>{line ? ` ${line}` : ''}</p>
      {action && <Link href={action.href} className="btn btn-primary">{action.label}</Link>}
    </div>
  );
}
