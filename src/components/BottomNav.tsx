'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartNoAxesColumn, House, Plus, UserRound, Vote } from 'lucide-react';
import { useT } from '@/lib/lang';

// Phone only (hidden on bigger screens by CSS). Two places on each side of one action, so the bar is balanced:
// Home · Polls · ( + ) · My votes · You (your profile and the polls you made). The round ink "+" opens Create full screen (owner: "there should not be a
// page [tab], there can be a plus button"). Ink is the colour of the one main action; yellow marks the tab you are on.
export default function BottomNav() {
  const path = usePathname();
  const t = useT();
  if (path.startsWith('/create')) return null;
  const tab = (to: string, label: string, Icon: typeof House, on: boolean) => (
    <Link key={to} href={to} className={'bottomnav-tab' + (on ? ' is-on' : '')} aria-current={on ? 'page' : undefined}>
      <span className="bottomnav-icon"><Icon size={20} strokeWidth={on ? 2.25 : 1.75} aria-hidden /></span>
      <span className="bottomnav-label">{label}</span>
    </Link>
  );
  return (
    <nav className="bottomnav" aria-label="Main">
      {tab('/', t.home, House, path === '/' || (path.startsWith('/p/') && !path.endsWith('/manage')) || path.startsWith('/pack/'))}
      {tab('/polls', t.duels, ChartNoAxesColumn, path.startsWith('/polls') || path.startsWith('/topic/'))}
      <Link href="/create" className="bottomnav-plus" aria-label={t.startDuel}>
        <span><Plus size={24} strokeWidth={2.25} aria-hidden /></span>
      </Link>
      {tab('/me', t.myVotes, Vote, path === '/me')}
      {tab('/you', t.you, UserRound, path.startsWith('/you') || path.startsWith('/mine') || path.endsWith('/manage'))}
    </nav>
  );
}
