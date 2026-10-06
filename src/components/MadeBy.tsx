import { ArrowUpRight } from 'lucide-react';
import type { Dict } from '@/lib/i18n';
import { MAKER_URL } from '@/lib/site';

// P3, the very last line of a page: who made Chunav, linking to the maker's portfolio (owner, Oct 2026). Quiet, so it
// never competes with voting; opens in a new tab so the poll stays where it was.
export default function MadeBy({ t }: { t: Dict }) {
  return (
    <p className="made-by small">
      {t.madeBefore}
      <a href={MAKER_URL} target="_blank" rel="noopener" className="text-link" aria-label={t.makerLink}>
        {t.makerName}
        <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden />
      </a>
      {t.madeAfter}
    </p>
  );
}
