import type { Dict } from '@/lib/i18n';
import { MAKER_URL } from '@/lib/site';

// P3, the very last line of a page: who designed and built Chunav, linking to the portfolio (owner, Oct 2026: "subtle,
// at the bottom; no underline, arrow, colour or bold"). Plain small grey text; opens in a new tab so the poll stays.
export default function MadeBy({ t }: { t: Dict }) {
  return (
    <p className="made-by">
      <a href={MAKER_URL} target="_blank" rel="noopener" aria-label={t.makerLink}>{t.makerLine}</a>
    </p>
  );
}
