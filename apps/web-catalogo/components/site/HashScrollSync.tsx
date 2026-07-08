'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { scrollToHashWhenReady } from '@/lib/hashNavigation';

/** Sincroniza scroll al ancla tras navegación client-side a la home. */
export function HashScrollSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/') return;
    const hash = window.location.hash;
    if (!hash) return;
    scrollToHashWhenReady(hash);
  }, [pathname]);

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.pathname !== '/') return;
      scrollToHashWhenReady(window.location.hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return null;
}
