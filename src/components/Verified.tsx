import { BadgeCheck } from 'lucide-react';

/** The verified badge next to a name (a real creator, brand or college, checked by the owner). Icon + a screen-reader
 * word; the colour is never the only sign (the shape is the check). */
export default function Verified({ label }: { label: string }) {
  return (
    <span className="verified" title={label}>
      <BadgeCheck size={16} strokeWidth={2.25} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
