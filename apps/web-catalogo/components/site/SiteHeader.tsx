'use client';

import Link from 'next/link';
import { User2, LogOut } from 'lucide-react';
import { BranchSelect } from '@/components/branch/BranchSelect';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/env';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/servicios', label: 'Servicios' },
  { href: '/productos', label: 'Productos' },
  { href: '/reservar', label: 'Reservar' },
  { href: '/#descargar', label: 'App' },
];

export function SiteHeader({ userEmail }: { userEmail: string | null }) {
  const router = useRouter();

  const onLogout = async () => {
    if (!isSupabaseConfigured) return;
    await createClient().auth.signOut();
    router.refresh();
  };

  return (
    <header className="glass sticky top-0 z-50 border-b border-border">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-andreas-transparent.png"
            alt="Andreas · AppSalon Pro"
            className="h-11 w-11 object-contain"
          />
          <span className="hidden text-[15px] font-light tracking-[0.32em] text-cream min-[420px]:inline">
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

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <BranchSelect compact />
          {userEmail ? (
            <div className="flex items-center gap-2">
              <Link
                href="/cuenta"
                className="hidden items-center gap-1.5 text-sm font-light text-muted hover:text-gold sm:flex"
              >
                <User2 className="h-4 w-4" />
                {userEmail.split('@')[0]}
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
              className="rounded-full border border-gold/40 bg-gold/5 px-6 py-2 text-[13px] font-light uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold hover:text-charcoal"
            >
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
