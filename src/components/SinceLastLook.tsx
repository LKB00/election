'use client';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/lang';

// My votes: what changed since you last looked at this poll, from this phone's own memory (no account, nothing sent).
// "+12 new votes" and "Lead changed!" are the true, small news that make coming back worth it. Shown once per change.
const KEY = 'election-me-seen';
type Seen = Record<string, { v: number; lead: string | null }>;

export default function SinceLastLook({ pollId, voters, lead }: { pollId: string; voters: number; lead: string | null }) {
  const t = useT();
  const [news, setNews] = useState<{ more: number; leadChanged: boolean } | null>(null);
  useEffect(() => {
    try {
      const seen = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Seen;
      const before = seen[pollId];
      if (before) {
        const more = Math.max(0, voters - before.v);
        const leadChanged = !!before.lead && !!lead && before.lead !== lead;
        if (more > 0 || leadChanged) setNews({ more, leadChanged });
      }
      seen[pollId] = { v: voters, lead };
      // Keep the memory small: the 100 polls looked at most recently.
      const keys = Object.keys(seen);
      if (keys.length > 100) for (const k of keys.slice(0, keys.length - 100)) delete seen[k];
      localStorage.setItem(KEY, JSON.stringify(seen));
    } catch {}
  }, [pollId, voters, lead]);
  if (!news) return null;
  return (
    <span className="index-news small">
      {news.leadChanged && <strong>{t.meLeadChanged}</strong>}
      {news.leadChanged && news.more > 0 && ' · '}
      {news.more > 0 && t.meNewVotes(news.more)}
    </span>
  );
}
