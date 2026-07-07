'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, User2, LogOut, Menu } from 'lucide-react';
import { BranchSelect } from '@/components/branch/BranchSelect';
import { MobileNavDrawer } from '@/components/site/MobileNavDrawer';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseConfig } from '@/components/supabase/SupabaseConfigProvider';
import { useRouter } from 'next/navigation';
import { NAV_MORE, NAV_PRIMARY } from '@/lib/navigation';
function LoginButton({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/login"
      className={`rounded-full border border-gold/40 bg-gold/5 px-4 py-1.5 text-[11px] font-light uppercase tracking-[0.14em] text-gold transition-colors hover:bg-gold hover:text-charcoal sm:px-6 sm:py-2 sm:text-[13px] sm:tracking-[0.18em] ${className}`}
    >
      Ingresar
    </Link>
  );
}

export function SiteHeader({
  userEmail,
  userDisplayName,
}: {
  userEmail: string | null;
  userDisplayName?: string | null;
}) {
  const router = useRouter();
  const { configured: supabaseConfigured } = useSupabaseConfig();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen]);
  const onLogout = async () => {
    if (!supabaseConfigured) return;
    await createClient().auth.signOut();
    router.refresh();
  };

  return (
    <header className="glass sticky top-0 z-50 border-b border-border">
      {/* Móvil: logo | ingresar | menú */}
      <div className="mx-auto grid h-14 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 md:hidden">
        <Link
          href="/"
          className="flex shrink-0 items-center justify-self-start"
          aria-label="Inicio AppSalon Pro"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-andreas-transparent.png"
            alt=""
            className="h-9 w-9 object-contain"
          />
        </Link>

        <div className="justify-self-center">
          {userEmail ? (
            <Link
              href="/cuenta"
              aria-label="Mi cuenta"
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-light text-muted"
            >
              <User2 className="h-3.5 w-3.5 shrink-0 text-gold" />
              <span className="max-w-[5.5rem] truncate">
                {userDisplayName?.split(/\s+/)[0] || userEmail.split('@')[0]}
              </span>
            </Link>
          ) : (
            <LoginButton />
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          className="justify-self-end rounded-full border border-border p-2 text-muted transition-colors hover:border-border-strong hover:text-gold"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop: logo | navegación centrada | sucursal + cuenta */}
      <div className="mx-auto hidden h-[72px] max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-6 px-4 sm:px-6 lg:px-8 md:grid">
        <Link
          href="/"
          className="flex shrink-0 items-center"
          aria-label="Inicio Andreas"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-andreas-transparent.png"
            alt="Andreas"
            className="h-11 w-11 object-contain sm:h-12 sm:w-12"
          />
        </Link>

        <nav className="flex items-center justify-center gap-8 lg:gap-10">
          {NAV_PRIMARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="link-underline text-[13px] font-light uppercase tracking-[0.18em] text-muted transition-colors hover:text-cream"
            >
              {item.label}
            </Link>
          ))}

          <div ref={moreMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="Más secciones"
              className="flex items-center rounded-full border border-transparent p-1 text-muted transition-colors hover:border-border hover:text-gold"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {moreOpen ? (
              <div
                role="menu"
                className="absolute left-1/2 top-[calc(100%+0.65rem)] z-50 min-w-[12.5rem] -translate-x-1/2 rounded-xl border border-border bg-charcoal py-2 shadow-2xl"
              >
                {NAV_MORE.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className="block px-4 py-2.5 text-[12px] font-light uppercase tracking-[0.16em] text-pearl transition-colors hover:bg-surface hover:text-gold"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>
        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          <BranchSelect compact />
          {userEmail ? (
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                href="/cuenta"
                aria-label="Mi cuenta"
                title={userDisplayName || userEmail}
                className="flex shrink-0 items-center gap-1.5 sm:max-w-[10rem]"
              >
                <User2 className="h-4 w-4 shrink-0 text-muted" />
                <span className="hidden truncate text-sm font-light sm:inline">
                  {userDisplayName?.split(/\s+/)[0] ||
                    userEmail.split('@')[0]}
                </span>
              </Link>
              <button
                onClick={onLogout}
                aria-label="Cerrar sesión"
                className="rounded-full border border-border p-2 text-muted transition-colors hover:border-border-strong hover:text-gold"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>

      <MobileNavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        userEmail={userEmail}
        userDisplayName={userDisplayName}
      />
    </header>
  );
}
