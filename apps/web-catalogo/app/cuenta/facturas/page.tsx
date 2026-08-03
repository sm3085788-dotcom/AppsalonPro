import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  MisFacturasPanel,
  MisFacturasPanelLoading,
} from '@/components/cuenta/MisFacturasPanel';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { displayNameFromUser } from '@/lib/clientDisplayName';
import { ensureClienteFromAuth } from '@/lib/data/cliente';
import { fetchMisFacturas } from '@/lib/data/clientFacturas';

export const metadata = { title: 'Mis facturas | AppSalon Pro' };

async function FacturasContent() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/cuenta/facturas');

  let facturas: Awaited<ReturnType<typeof fetchMisFacturas>>['data'] = [];
  let error: string | null = null;
  let clienteNombre = displayNameFromUser(user);
  let hasCliente = false;

  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { row } = await ensureClienteFromAuth(supabase, user);
    if (row?.nombre?.trim()) clienteNombre = row.nombre.trim();
    hasCliente = Boolean(row?.id);

    if (hasCliente) {
      const res = await fetchMisFacturas(supabase);
      facturas = res.data;
      error = res.error;
    }
  }

  return (
    <MisFacturasPanel
      initialFacturas={facturas}
      initialError={error}
      clienteNombre={clienteNombre}
      hasCliente={hasCliente}
    />
  );
}

export default function MisFacturasPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/cuenta"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Mi cuenta
      </Link>
      <SectionHeader
        eyebrow="Comprobantes"
        title="Mis facturas"
        subtitle="Folios y totales de tus compras y servicios registrados en el salón."
      />
      <div className="mt-8">
        <Suspense fallback={<MisFacturasPanelLoading />}>
          <FacturasContent />
        </Suspense>
      </div>
    </div>
  );
}
