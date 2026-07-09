'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { normalizeHash, scrollToHashWhenReady } from '@/lib/hashNavigation';

/** Sincroniza scroll al ancla tras navegación client-side a la home. */
export function HashScrollSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/') return;
    const hash = normalizeHash(window.location.hash);
    if (!hash) return;
    scrollToHashWhenReady(hash, 72, 50);
  }, [pathname]);

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.pathname !== '/') return;
      const hash = normalizeHash(window.location.hash);
      if (!hash) return;
      scrollToHashWhenReady(hash, 40, 40);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return null;
}
