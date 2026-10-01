'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Plus } from 'lucide-react';

const tabs = [
  { href: '/', label: 'Home', Icon: House, on: (p: string) => p === '/' || p.startsWith('/p/') },
  { href: '/create', label: 'Create', Icon: Plus, on: (p: string) => p === '/create' },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottomnav" aria-label="Main">
      {tabs.map(({ href, label, Icon, on }) => (
        <Link key={href} href={href} className={on(path) ? 'is-on' : ''} aria-current={on(path) ? 'page' : undefined}>
          <Icon size={20} strokeWidth={on(path) ? 2.25 : 1.75} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
