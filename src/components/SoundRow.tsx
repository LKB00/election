'use client';
import { Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { setSound, soundOn } from '@/lib/sound';
import { useT } from '@/lib/lang';

// The voting beep on or off (owner, Oct 2026: it was a speaker button in the top bar that looked like a mic). One row in
// You's settings, the same switch row as Create's settings. Remembered on this phone.
export default function SoundRow() {
  const t = useT();
  // Read after loading, so the server page and the phone agree.
  const [on, setOn] = useState(true);
  useEffect(() => setOn(soundOn()), []);
  return (
    <li>
      <button type="button" role="switch" aria-checked={on} className="al-row create-row" onClick={() => { setSound(!on); setOn(!on); }}>
        <span className="al-row__disc" style={{ '--tone': on ? 'var(--lime)' : 'var(--sand)' } as React.CSSProperties} aria-hidden><Volume2 size={18} strokeWidth={1.75} /></span>
        <span className="al-row__main">
          <span className="al-row__title">{t.soundTitle}</span>
          <span className="al-row__meta">{t.soundNote}</span>
        </span>
        <span className={'switch' + (on ? ' is-on' : '')} aria-hidden><span /></span>
      </button>
    </li>
  );
}
