/** Navegación y scroll a secciones con ancla en la home (/#id). */

export function isHomeHashHref(href: string): string | null {
  const match = href.match(/^\/(#.+)$/);
  return match ? match[1] : null;
}

export function normalizeHash(hash: string): string {
  if (!hash) return '';
  return hash.startsWith('#') ? hash : `#${hash}`;
}

export function getSiteHeaderOffset(): number {
  if (typeof document === 'undefined') return 72;
  const header = document.querySelector('header');
  return header ? Math.ceil(header.getBoundingClientRect().height) + 8 : 72;
}

export function scrollToHash(
  hash: string,
  behavior: ScrollBehavior = 'smooth',
): boolean {
  const id = normalizeHash(hash).replace(/^#/, '');
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
  const normalized = normalizeHash(hash);
  if (!normalized) return;

  let tries = 0;
  const tick = () => {
    if (scrollToHash(normalized)) return;
    tries += 1;
    if (tries < attempts) {
      window.setTimeout(tick, intervalMs);
    }
  };

  tick();
}

type HashRouter = { push: (href: string) => void };

function applyHashToUrl(hash: string, replace = false): void {
  const normalized = normalizeHash(hash);
  if (!normalized) return;
  const next = `${window.location.pathname}${normalized}`;
  if (replace) {
    window.history.replaceState(null, '', next);
  } else {
    window.history.pushState(null, '', next);
  }
}

export function navigateHomeHash(
  hash: string,
  router: HashRouter,
  opts?: { drawerCloseDelayMs?: number },
): void {
  const delay = opts?.drawerCloseDelayMs ?? 120;
  const normalizedHash = normalizeHash(hash);
  if (!normalizedHash) return;

  const scrollAfterNav = (attempts = 48, intervalMs = 50) => {
    applyHashToUrl(normalizedHash, true);
    scrollToHashWhenReady(normalizedHash, attempts, intervalMs);
  };

  if (window.location.pathname === '/') {
    applyHashToUrl(normalizedHash, false);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => scrollAfterNav(40, 40), delay);
    });
    return;
  }

  // App Router no siempre conserva el hash en router.push('/#id'); ir a home y anclar después.
  router.push('/');
  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      if (window.location.pathname === '/') {
        scrollAfterNav(72, 50);
        return;
      }
      window.location.assign(`/${normalizedHash}`);
    }, delay + 220);
  });
}
