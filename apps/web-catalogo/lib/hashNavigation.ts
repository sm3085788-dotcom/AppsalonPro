/** Navegación y scroll a secciones con ancla en la home (/#id). */

export function isHomeHashHref(href: string): string | null {
  const match = href.match(/^\/(#.+)$/);
  return match ? match[1] : null;
}

export function getSiteHeaderOffset(): number {
  if (typeof document === 'undefined') return 72;
  const header = document.querySelector('header.glass');
  return header ? Math.ceil(header.getBoundingClientRect().height) + 8 : 72;
}

export function scrollToHash(
  hash: string,
  behavior: ScrollBehavior = 'smooth',
): boolean {
  const id = hash.replace(/^#/, '');
  if (!id) return false;

  const el = document.getElementById(id);
  if (!el) return false;

  const top =
    el.getBoundingClientRect().top + window.scrollY - getSiteHeaderOffset();
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

/** Reintenta hasta que la sección exista (tras navegación client-side). */
export function scrollToHashWhenReady(
  hash: string,
  attempts = 30,
  intervalMs = 50,
): void {
  if (!hash) return;

  let tries = 0;
  const tick = () => {
    if (scrollToHash(hash)) return;
    tries += 1;
    if (tries < attempts) {
      window.setTimeout(tick, intervalMs);
    }
  };

  tick();
}

type HashRouter = { push: (href: string) => void };

export function navigateHomeHash(
  hash: string,
  router: HashRouter,
  opts?: { drawerCloseDelayMs?: number },
): void {
  const delay = opts?.drawerCloseDelayMs ?? 120;

  if (window.location.pathname === '/') {
    window.history.pushState(null, '', hash);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => scrollToHashWhenReady(hash, 12, 32), delay);
    });
    return;
  }

  router.push(`/${hash}`);
}
