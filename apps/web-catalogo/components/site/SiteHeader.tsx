'use client';

import Link from 'next/link';
import { Sparkles, User2, LogOut } from 'lucide-react';
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
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-gold" />
          <span className="text-lg font-light tracking-[0.2em] text-cream">
            APPSALON <span className="text-gold">PRO</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-light text-muted transition-colors hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <BranchSelect compact />
          </div>
          {userEmail ? (
            <div className="flex items-center gap-2">
              <Link
                href="/cuenta"
                className="hidden items-center gap-1.5 text-sm text-muted hover:text-gold sm:flex"
              >
                <User2 className="h-4 w-4" />
                {userEmail.split('@')[0]}
              </Link>
              <button
                onClick={onLogout}
                aria-label="Cerrar sesión"
                className="rounded-full border border-border p-2 text-muted transition-colors hover:border-gold hover:text-gold"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-gold-soft"
            >
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
