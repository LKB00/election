'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { setSound, soundOn } from '@/lib/sound';
import { setLangCookie, useLang, useT } from '@/lib/lang';

export default function TopBar() {
  const path = usePathname();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  // EVM beep on/off. Read after loading, so the server page and the phone agree.
  const [sound, setS] = useState(true);
  useEffect(() => setS(soundOn()), []);
  const back = path.startsWith('/p/') ? { to: '/', name: t.home } : null;
  return (
    <header className="topnav">
      <div className={'topnav-inner' + (back ? ' has-back' : '')}>
        {back && (
          <Link href={back.to} className="topnav-back">
            <ChevronLeft size={20} strokeWidth={2} aria-hidden /> {back.name}
          </Link>
        )}
        <Link href="/" className="logo" aria-label="Election, home">
          <span className="logo-mark" aria-hidden />
          <span className="logo-text"><span className="logo-full">Election</span></span>
        </Link>
        <nav className="topnav-links" aria-label="Main">
          <Link href="/duels" className={path.startsWith('/duels') ? 'active' : ''}>{t.duels}</Link>
          <Link href="/create" className={path === '/create' ? 'active' : ''}>{t.create}</Link>
          <Link href="/me" className={path === '/me' ? 'active' : ''}>{t.myVotes}</Link>
        </nav>
        <div className="topnav-right">
          {/* Hindi / English. Shown in the other language's own script, so people can find it. */}
          <button
            type="button"
            className="icon-btn lang-btn"
            aria-label={t.switchLang}
            title={t.switchLang}
            onClick={() => {
              setLangCookie(lang === 'en' ? 'hi' : 'en');
              router.refresh();
            }}
          >
            {t.langShort}
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-pressed={!sound}
            aria-label={sound ? t.beepOff : t.beepOn}
            title={sound ? t.beepOff : t.beepOn}
            onClick={() => {
              setSound(!sound);
              setS(!sound);
            }}
          >
            {sound ? <Volume2 size={16} strokeWidth={1.75} aria-hidden /> : <VolumeX size={16} strokeWidth={1.75} aria-hidden />}
          </button>
        </div>
      </div>
    </header>
  );
}
