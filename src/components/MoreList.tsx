'use client';
import { Children, useState } from 'react';
import { useT } from '@/lib/lang';
import { LIST_FIRST } from '@/lib/limits';

/** A list card that shows a few rows first; "Show N more" adds another few (Miller's and Hick's laws). */
export default function MoreList({ children, className }: { children: React.ReactNode; className?: string }) {
  const t = useT();
  const rows = Children.toArray(children);
  const [count, setCount] = useState(LIST_FIRST);
  const hidden = rows.length - Math.min(count, rows.length);
  return (
    <>
      <ul className={className}>{rows.slice(0, count)}</ul>
      {hidden > 0 && (
        <button type="button" className="btn btn-ghost btn-lg al-more" onClick={() => setCount((c) => c + LIST_FIRST)}>{t.showMorePolls(Math.min(hidden, LIST_FIRST))}</button>
      )}
    </>
  );
}
