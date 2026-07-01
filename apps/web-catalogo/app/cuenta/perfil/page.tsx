import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { ensureClienteFromAuth } from '@/lib/data/cliente';

export const metadata = { title: 'Editar perfil | AppSalon Pro' };

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/cuenta/perfil');

  const sp = await searchParams;
  const redirectTo = sp.from?.startsWith('/') ? sp.from : '/cuenta';

  const supabase = await createSupabaseServerClient();
  const { row } = await ensureClienteFromAuth(supabase, user);

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/cuenta"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Mi cuenta
      </Link>
      <SectionHeader
        eyebrow="Tu ficha"
        title="Editar perfil"
        subtitle="Completá tus datos para que el salón te reconozca en citas y pedidos."
      />
      <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <ProfileEditForm
          clienteRow={row}
          sessionUser={user}
          redirectTo={redirectTo}
        />
      </div>
    </div>
  );
}
