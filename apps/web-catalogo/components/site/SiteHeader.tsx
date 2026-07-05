'use client';

import Link from 'next/link';
import { User2, LogOut } from 'lucide-react';
import { BranchSelect } from '@/components/branch/BranchSelect';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseConfig } from '@/components/supabase/SupabaseConfigProvider';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/servicios', label: 'Servicios' },
  { href: '/productos', label: 'Productos' },
  { href: '/reservar', label: 'Reservar' },
  { href: '/#descargar', label: 'App' },
];

export function SiteHeader({
  userEmail,
  userDisplayName,
}: {
  userEmail: string | null;
  userDisplayName?: string | null;
}) {
  const router = useRouter();
  const { configured: supabaseConfigured } = useSupabaseConfig();

  const onLogout = async () => {
    if (!supabaseConfigured) return;
    await createClient().auth.signOut();
    router.refresh();
  };

  return (
    <header className="glass sticky top-0 z-50 border-b border-border">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="Inicio AppSalon Pro"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-andreas-transparent.png"
            alt="Andreas · AppSalon Pro"
            className="h-11 w-11 object-contain sm:h-12 sm:w-12"
          />
          <span className="hidden text-[15px] font-light tracking-[0.32em] text-cream min-[520px]:inline">
            APPSALON <span className="text-gold">PRO</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="link-underline text-[13px] font-light uppercase tracking-[0.18em] text-muted transition-colors hover:text-cream"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          <div className="min-w-0 max-w-[11rem] sm:max-w-none">
            <BranchSelect compact />
          </div>
          {userEmail ? (
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                href="/cuenta"
                aria-label="Mi cuenta"
                title={userDisplayName || userEmail}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-border p-2 text-muted transition-colors hover:border-border-strong hover:text-gold sm:max-w-[10rem] sm:border-0 sm:p-0"
              >
                <User2 className="h-4 w-4 shrink-0" />
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
            <Link
              href="/login"
              className="shrink-0 rounded-full border border-gold/40 bg-gold/5 px-4 py-2 text-[12px] font-light uppercase tracking-[0.16em] text-gold transition-colors hover:bg-gold hover:text-charcoal sm:px-6 sm:text-[13px] sm:tracking-[0.18em]"
            >
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
