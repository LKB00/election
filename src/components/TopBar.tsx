'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChartNoAxesColumn, ChevronLeft, House, Languages, Plus, UserRound, Vote, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { setLangCookie, useLang, useT } from '@/lib/lang';
import { LANG_NAMES, LANG_SHORT, LANGS, type Lang } from '@/lib/i18n';
import LogoMark from './LogoMark';

// Set once you move from one page to another inside the site (the browser's "where you came from" only knows the page
// you first arrived from, e.g. WhatsApp, so it used to send Back to Home after Polls → a poll).
let movedInside = false;
let firstPath: string | null = null;

export default function TopBar() {
  const path = usePathname();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  // Back: your poll's page goes back to You; a poll, pack, topic or maker page goes back where you came from inside the
  // site (Polls, My votes, a topic…), or Home when the link was opened from outside (WhatsApp).
  const managing = /^\/p\/[^/]+\/manage/.test(path);
  const backable = managing || ['/p/', '/pack/', '/topic/', '/u/'].some((x) => path.startsWith(x));
  const [fromSite, setFromSite] = useState(false);
  useEffect(() => {
    if (firstPath === null) firstPath = path;
    else if (path !== firstPath) movedInside = true;
    try {
      setFromSite(movedInside || (!!document.referrer && new URL(document.referrer).host === window.location.host && window.history.length > 1));
    } catch {
      setFromSite(false);
    }
  }, [path]);
  const back = !backable ? null : managing ? { to: '/you', name: t.you } : fromSite ? { to: null, name: t.back } : { to: '/', name: t.home };
  // Create opens full screen (the "+" action, not a tab): a × takes you back to where you were.
  const creating = path.startsWith('/create');
  const close = () => (window.history.length > 1 ? router.back() : router.push('/'));
  // Which place you are in: the same rules as the phone's bottom bar (BottomNav.tsx).
  const onHome = path === '/' || (path.startsWith('/p/') && !managing) || path.startsWith('/pack/');
  const onPolls = path.startsWith('/polls') || path.startsWith('/topic/');
  const onYou = path.startsWith('/you') || path.startsWith('/mine') || managing;
  const tab = (to: string, label: string, Icon: typeof House, on: boolean) => (
    <Link href={to} className={on ? 'active' : ''} aria-current={on ? 'page' : undefined}>
      <Icon size={16} strokeWidth={on ? 2.25 : 1.75} aria-hidden /> {label}
    </Link>
  );
  // The big-screen view (/p/<id>/tv) is the whole screen: no bars (after the hooks above, which must always run).
  if (path.endsWith('/tv')) return null;
  return (
    <header className="topnav">
      <div className={'topnav-inner' + (back || creating ? ' has-back' : '')}>
        {creating && (
          <button type="button" className="topnav-back topnav-close" onClick={close} aria-label={t.close}>
            <X size={20} strokeWidth={2} aria-hidden /> {t.close}
          </button>
        )}
        {back && (back.to ? (
          <Link href={back.to} className="topnav-back">
            <ChevronLeft size={20} strokeWidth={2} aria-hidden /> {back.name}
          </Link>
        ) : (
          <button type="button" className="topnav-back" onClick={() => router.back()}>
            <ChevronLeft size={20} strokeWidth={2} aria-hidden /> {back.name}
          </button>
        ))}
        <Link href="/" className="logo" aria-label={t.logoHome}>
          <LogoMark size={24} />
          <span className="logo-text"><span className="logo-full">{t.siteName}</span></span>
        </Link>
        {/* Computers (hidden on phones, which have the bottom bar): the same places in the same order, with the same
            pictures, so the site reads the same on both. Starting a poll is the one action, so it is a button on the right,
            not a fourth tab; your profile sits at the far right, where sites keep "you". docs/DESIGN.md, "Top bar". */}
        <nav className="topnav-links" aria-label={t.navMain}>
          {tab('/', t.home, House, onHome)}
          {tab('/polls', t.duels, ChartNoAxesColumn, onPolls)}
          {tab('/me', t.myVotes, Vote, path === '/me')}
        </nav>
        <div className="topnav-right">
          {!creating && (
            <Link href="/create" className="btn btn-primary topnav-start hide-phone">
              <Plus size={16} strokeWidth={2.25} aria-hidden /> {t.startDuel}
            </Link>
          )}
          {/* English / हिंदी / Hinglish: the phone's own menu, each name in its own script so people find theirs.
              The button shows a short code (so the logo fits on small phones); the menu shows the full names. */}
          <label className="icon-btn lang-btn" title={t.language}>
            <Languages size={15} strokeWidth={1.75} aria-hidden />
            <span className="lang-code" aria-hidden>{LANG_SHORT[lang]}</span>
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
          <Link href="/you" className={'icon-btn topnav-you hide-phone' + (onYou ? ' is-on' : '')} aria-label={t.you} title={t.you} aria-current={onYou ? 'page' : undefined}>
            <UserRound size={18} strokeWidth={onYou ? 2.25 : 1.75} aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
