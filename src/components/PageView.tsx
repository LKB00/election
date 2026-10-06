'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { track } from '@/lib/track';

// Counts every page opened for "N views" at the bottom of Home. Home and a poll already count themselves (home_view,
// poll_view, for the owner's step counter), so they are skipped here. Only the number goes up; nothing about the visitor.
const SELF_COUNTED = /^\/(p\/[^/]+)?$/;

export default function PageView() {
  const path = usePathname();
  useEffect(() => {
    if (path && !SELF_COUNTED.test(path)) track('page_view');
  }, [path]);
  return null;
}
