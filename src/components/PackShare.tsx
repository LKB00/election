'use client';
import { Share2 } from 'lucide-react';
import { useT } from '@/lib/lang';

// Send the whole pack to the group (WhatsApp first: that is where match-day chat happens).
export default function PackShare({ id, title }: { id: string; title: string }) {
  const t = useT();
  async function share() {
    const url = `${window.location.origin}/pack/${id}`;
    const text = t.packShare(title);
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}${url.includes('?') ? '&' : '?'}src=wa`)}`, '_blank', 'noopener');
  }
  return (
    <p className="block-tight">
      <button type="button" className="btn btn-ghost" onClick={share}><Share2 size={14} strokeWidth={1.75} aria-hidden /> {t.packShareBtn}</button>
    </p>
  );
}
