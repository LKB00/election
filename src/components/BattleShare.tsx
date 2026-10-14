'use client';
import { Share2 } from 'lucide-react';
import { useT } from '@/lib/lang';

/** "Share the battle": the phone's own share sheet, or WhatsApp where there is none. */
export default function BattleShare({ id, title, primary = false }: { id: string; title: string; primary?: boolean }) {
  const t = useT();
  async function share() {
    const url = `${window.location.origin}/b/${id}`;
    const words = t.battleShareText(title);
    try {
      if (navigator.share) return await navigator.share({ text: words, url });
    } catch {
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${words} ${url}`)}`, '_blank', 'noopener');
  }
  return (
    <button type="button" className={'btn btn-lg ' + (primary ? 'btn-primary' : 'btn-ghost')} onClick={share}>
      <Share2 size={18} strokeWidth={2} aria-hidden /> {t.battleShare}
    </button>
  );
}
