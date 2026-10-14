'use client';
import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { useLang, useT } from '@/lib/lang';
import type { CreatorWeek } from '@/lib/profiles';

// "Your week" on You (docs/DESIGN.md, "Your week"): the last 7 days on your polls in one line (P2), and the story
// picture to post on WhatsApp Status or Instagram (P2), shared as a file where the phone can, else opened to save.
export default function WeekCard({ uid, week }: { uid: string; week: CreatorWeek }) {
  const t = useT();
  const lang = useLang();
  // The numbers in the address: a fresh picture when they change (not an old saved copy).
  const src = `/api/card/week/${uid}?v=${week.votes}-${week.made}${lang === 'hg' ? '&l=hg' : ''}`;
  const [busy, setBusy] = useState(false);
  async function share() {
    setBusy(true);
    try {
      const blob = await fetch(src).then((r) => r.blob());
      const file = new File([blob], 'my-week.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: `${window.location.origin}/u/${uid}?src=wa` });
      else window.open(src, '_blank', 'noopener');
    } catch {
      /* the person closed the share menu */
    }
    setBusy(false);
  }
  return (
    <section className="al-block you-week" aria-label={t.weekTitle}>
      <h2 className="al-block__title">{t.weekTitle}</h2>
      <div className="maker-results">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="maker-results-img" loading="lazy" width={108} height={192} />
        <div className="maker-results-side">
          <p><strong>{t.weekLine(week.votes, week.made)}</strong></p>
          {week.top && <p className="small muted">{t.weekTop(week.top.title, week.top.votes)}</p>}
          <button type="button" className="btn btn-ghost" onClick={share} disabled={busy}>
            <ImageIcon size={16} strokeWidth={2} aria-hidden /> {t.weekShare}
          </button>
        </div>
      </div>
    </section>
  );
}
