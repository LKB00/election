import type { Dict } from '@/lib/i18n';
import { MAKER_URL } from '@/lib/site';

// P3, the very last line of a page: who designed and built Chunav, linking to the portfolio (owner, Oct 2026: "subtle,
// at the bottom; no arrow, colour or bold", then "underline Lokesh Bhatia"). Small grey text; only the name is the link,
// underlined in the same grey. Opens in a new tab so the poll stays.
export default function MadeBy({ t }: { t: Dict }) {
  return (
    <p className="made-by">
      {t.makerBefore}
      <a href={MAKER_URL} target="_blank" rel="noopener" aria-label={t.makerLink}>{t.makerName}</a>
      {t.makerAfter}
    </p>
  );
}
