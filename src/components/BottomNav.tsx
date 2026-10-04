'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartNoAxesColumn, House, Plus, Vote } from 'lucide-react';
import { useT } from '@/lib/lang';
import type { Dict } from '@/lib/i18n';

// Phone only (hidden on bigger screens by CSS), like patricka.
const tabs = [
  { to: '/', label: 'home' as const, icon: House, match: (p: string) => p === '/' || p.startsWith('/p/') },
  { to: '/polls', label: 'duels' as const, icon: ChartNoAxesColumn, match: (p: string) => p.startsWith('/polls') },
  { to: '/create', label: 'create' as const, icon: Plus, match: (p: string) => p === '/create' },
  { to: '/me', label: 'myVotes' as const, icon: Vote, match: (p: string) => p.startsWith('/me') },
];

export default function BottomNav() {
  const path = usePathname();
  const t = useT();
  return (
    <nav className="bottomnav" aria-label="Main">
      {tabs.map(({ to, label, icon: Icon, match }) => {
        const on = match(path);
        return (
          <Link key={to} href={to} className={'bottomnav-tab' + (on ? ' is-on' : '')} aria-current={on ? 'page' : undefined}>
            <span className="bottomnav-icon"><Icon size={20} strokeWidth={on ? 2.25 : 1.75} aria-hidden /></span>
            <span>{t[label as keyof Dict] as string}</span>
          </Link>
        );
      })}
    </nav>
  );
}
