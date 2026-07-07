'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, User2, LogOut } from 'lucide-react';
import { BranchSelect } from '@/components/branch/BranchSelect';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseConfig } from '@/components/supabase/SupabaseConfigProvider';
import { useRouter } from 'next/navigation';

import { NAV_ALL } from '@/lib/navigation';

export function MobileNavDrawer({
  open,
  onClose,
  userEmail,
  userDisplayName,
}: {
  open: boolean;
  onClose: () => void;
  userEmail: string | null;
  userDisplayName?: string | null;
}) {
  const router = useRouter();
  const { configured: supabaseConfigured } = useSupabaseConfig();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onLogout = async () => {
    if (!supabaseConfigured) return;
    await createClient().auth.signOut();
    onClose();
    router.refresh();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Cerrar menú"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-[min(100%,18.5rem)] flex-col border-l border-border bg-charcoal shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-[11px] font-light uppercase tracking-[0.22em] text-muted">
            Menú
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full border border-border p-2 text-muted transition-colors hover:border-border-strong hover:text-gold"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted">
              Sucursal
            </p>
            <BranchSelect variant="field" />
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ALL.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="rounded-xl px-3 py-2.5 text-[13px] font-light uppercase tracking-[0.16em] text-pearl transition-colors hover:bg-surface hover:text-gold"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {userEmail ? (
            <div className="mt-auto border-t border-border pt-4">
              <Link
                href="/cuenta"
                onClick={onClose}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-light text-pearl hover:bg-surface"
              >
                <User2 className="h-4 w-4 text-gold" />
                {userDisplayName?.split(/\s+/)[0] || userEmail.split('@')[0]}
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-light text-muted hover:bg-surface hover:text-gold"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
