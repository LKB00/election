'use client';
import { useEffect, useRef } from 'react';

// Phone behaviour for anything that covers the page (share panel, vote moment):
// - the page behind does not scroll while it is open;
// - with `back`, the phone's Back button closes it instead of leaving the page (one history entry while open).
// Render the overlay with createPortal(…, document.body), so the bottom bar can never sit on top of it.
export function useOverlay(onClose: () => void, { back = false }: { back?: boolean } = {}) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    let pushed = false;
    const onPop = () => {
      pushed = false;
      close.current();
    };
    if (back) {
      // Keep the router's own state in the entry, so going back is a no-op for the page itself.
      history.pushState({ ...history.state, overlay: true }, '');
      pushed = true;
      window.addEventListener('popstate', onPop);
    }
    return () => {
      html.style.overflow = before;
      window.removeEventListener('popstate', onPop);
      // Closed by a tap (not by Back): remove the entry we added, so Back works normally afterwards.
      if (pushed) history.back();
    };
  }, [back]);
}
