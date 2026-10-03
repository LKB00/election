'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, Languages, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { setSound, soundOn } from '@/lib/sound';
import { setLangCookie, useLang, useT } from '@/lib/lang';
import { LANG_NAMES, LANGS, type Lang } from '@/lib/i18n';

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
          {/* English / हिंदी / Hinglish: the phone's own menu, each name in its own script so people find theirs. */}
          <label className="icon-btn lang-btn" title={t.language}>
            <Languages size={15} strokeWidth={1.75} aria-hidden />
            <select
              aria-label={t.language}
              value={lang}
              onChange={(e) => {
                setLangCookie(e.target.value as Lang);
                router.refresh();
              }}
            >
              {LANGS.map((l) => (
                <option key={l} value={l} lang={l === 'hi' ? 'hi' : 'en'}>{LANG_NAMES[l]}</option>
              ))}
            </select>
          </label>
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
