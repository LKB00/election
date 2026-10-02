'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function TopBar() {
  const path = usePathname();
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
          <Link href="/me" className={path === '/me' ? 'active' : ''}>My votes</Link>
        </nav>
      </div>
    </header>
  );
}
