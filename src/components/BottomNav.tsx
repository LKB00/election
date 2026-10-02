'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Plus, Swords, Vote } from 'lucide-react';

// Phone only (hidden on bigger screens by CSS), like patricka.
const tabs = [
  { to: '/', label: 'Home', icon: House, match: (p: string) => p === '/' || p.startsWith('/p/') },
  { to: '/duels', label: 'Duels', icon: Swords, match: (p: string) => p.startsWith('/duels') },
  { to: '/create', label: 'Create', icon: Plus, match: (p: string) => p === '/create' },
  { to: '/me', label: 'My votes', icon: Vote, match: (p: string) => p.startsWith('/me') },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottomnav" aria-label="Main">
      {tabs.map(({ to, label, icon: Icon, match }) => {
        const on = match(path);
        return (
          <Link key={to} href={to} className={'bottomnav-tab' + (on ? ' is-on' : '')} aria-current={on ? 'page' : undefined}>
            <span className="bottomnav-icon"><Icon size={20} strokeWidth={on ? 2.25 : 1.75} aria-hidden /></span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
