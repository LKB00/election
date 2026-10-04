'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartNoAxesColumn, House, Plus, Vote } from 'lucide-react';
import { useT } from '@/lib/lang';

// Phone only (hidden on bigger screens by CSS). Three places to go (Home, Polls, My votes) and one action: the round
// ink "+" that opens Create (owner, Oct 2026: "there should not be a page [tab], there can be a plus button"). Ink is the
// colour of the one main action; yellow stays the marker of the tab you are on. Create itself opens full screen, so
// the bar steps aside there.
export default function BottomNav() {
  const path = usePathname();
  const t = useT();
  if (path.startsWith('/create')) return null;
  const tab = (to: string, label: string, Icon: typeof House, on: boolean) => (
    <Link key={to} href={to} className={'bottomnav-tab' + (on ? ' is-on' : '')} aria-current={on ? 'page' : undefined}>
      <span className="bottomnav-icon"><Icon size={20} strokeWidth={on ? 2.25 : 1.75} aria-hidden /></span>
      <span>{label}</span>
    </Link>
  );
  return (
    <nav className="bottomnav" aria-label="Main">
      {tab('/', t.home, House, path === '/' || path.startsWith('/p/') || path.startsWith('/pack/'))}
      {tab('/polls', t.duels, ChartNoAxesColumn, path.startsWith('/polls') || path.startsWith('/topic/'))}
      <Link href="/create" className="bottomnav-plus" aria-label={t.startDuel}>
        <span><Plus size={24} strokeWidth={2.25} aria-hidden /></span>
      </Link>
      {tab('/me', t.myVotes, Vote, path.startsWith('/me'))}
    </nav>
  );
}
