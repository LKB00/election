import Link from 'next/link';
import Spot, { type SpotKind } from './Spot';

// Every empty page has the same three parts and nothing else (docs/DESIGN.md, "Empty states"): a drawn picture, a short
// title with one line under it, and the one next step. Centred with room around it, so it reads at a glance.
export default function EmptyState({ kind = 'list', picture, title, line, action, secondary }: { kind?: SpotKind; /** A picture of its own (a topic's), instead of a drawn spot. */ picture?: React.ReactNode; title: string; line?: string; action?: { href: string; label: string }; /** A quiet text link under the button. */ secondary?: { href: string; label: string } }) {
  return (
    <div className="spot-empty">
      {picture ?? <Spot kind={kind} />}
      {/* A title, not a sentence: no full stop at the end. */}
      <h2 className="spot-empty__title">{title.replace(/[.।]$/, '')}</h2>
      {line && <p className="spot-empty__line">{line}</p>}
      {action && <Link href={action.href} className="btn btn-primary btn-lg spot-empty__go">{action.label}</Link>}
      {secondary && <Link href={secondary.href} className="text-link small spot-empty__more">{secondary.label}</Link>}
    </div>
  );
}
