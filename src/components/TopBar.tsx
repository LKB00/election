'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, ChevronLeft, Target } from 'lucide-react';
import { useStats } from '@/lib/useStats';

export default function TopBar() {
  const path = usePathname();
  const { votes, correct } = useStats();
  const back = path.startsWith('/p/') ? { to: '/', name: 'Home' } : null;
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
        {/* Your scores. Hidden until your first vote: "0" and "0" read like a failed quiz to a new visitor. */}
        {votes > 0 && (
        <div className="topnav-right">
          {/* Your guess score (right "who's winning?" guesses). Greyed until your first right guess. */}
          <Link href="/me" className={'streak-pill' + (correct > 0 ? ' is-lit' : '')} aria-label={`${correct} right guesses`}>
            <Target size={14} strokeWidth={2} aria-hidden />
            <span key={correct} className="xp-num">{correct}</span>
          </Link>
          <Link href="/me" className="xp-pill" aria-label={`${votes} votes cast`}>
            <Check size={14} strokeWidth={2.5} aria-hidden />
            <span key={votes} className="xp-num">{votes}</span>
            <span className="xp-unit">votes</span>
          </Link>
        </div>
        )}
      </div>
    </header>
  );
}
