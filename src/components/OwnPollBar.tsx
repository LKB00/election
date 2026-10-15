'use client';
import Link from 'next/link';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useT } from '@/lib/lang';
import { useMarkOwnPage } from '@/lib/ownNav';

// Your own poll's page (docs/DESIGN.md, "Your poll's place"): "Manage your poll" at the top, and it tells the top and
// bottom bars this poll is yours (Back goes to its maker page; the You tab is on). Sharing sits with the ballot.
export default function OwnPollBar({ id }: { id: string }) {
  const t = useT();
  useMarkOwnPage(`/p/${id}`, `/p/${id}/manage`, 'poll');
  return (
    <Link href={`/p/${id}/manage`} className="maker-bar">
      <SlidersHorizontal size={16} strokeWidth={2} aria-hidden /> {t.manageLink}
      <ChevronRight size={16} strokeWidth={2} aria-hidden />
    </Link>
  );
}
