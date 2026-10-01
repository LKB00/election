'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, ChevronLeft, Flame } from 'lucide-react';
import { useStats } from '@/lib/useStats';

export default function TopBar() {
  const path = usePathname();
  const { votes, streak, today } = useStats();
  const back = path.startsWith('/p/') || path === '/create' ? { to: '/', name: 'Home' } : null;
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
          <Link href="/duels" className={path.startsWith('/duels') ? 'active' : ''}>Duels</Link>
          <Link href="/create" className={path === '/create' ? 'active' : ''}>Create</Link>
        </nav>
        <div className="topnav-right">
          <Link href="/me" className={'streak-pill' + (today > 0 ? ' is-lit' : '')} aria-label={`${streak} day streak`}>
            <Flame size={14} strokeWidth={2} aria-hidden />
            <span key={streak} className="xp-num">{streak}</span>
          </Link>
          <Link href="/me" className="xp-pill" aria-label={`${votes} votes cast`}>
            <Check size={14} strokeWidth={2.5} aria-hidden />
            <span key={votes} className="xp-num">{votes}</span>
            <span className="xp-unit">votes</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
