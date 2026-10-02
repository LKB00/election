'use client';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/lang';

// Says so plainly when the phone has no internet (common on the move), instead of buttons that seem broken.
export default function OfflineBar() {
  const t = useT();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (!offline) return null;
  return <div className="offline-bar" role="status">{t.offline}</div>;
}
