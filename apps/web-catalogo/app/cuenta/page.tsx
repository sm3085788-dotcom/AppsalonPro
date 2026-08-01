import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarClock, ShoppingBag, UserPen, AlertCircle, Users } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { JoinTeamStatusBadge } from '@/components/recruitment/JoinTeamStatusBadge';
import { CuentaPedidosCitasPanels } from '@/components/cuenta/CuentaPedidosCitasPanels';
import { WebPushOptInCard } from '@/components/pwa/WebPushOptInCard';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { displayNameFromUser } from '@/lib/clientDisplayName';
import type { JoinTeamEstado } from '@/lib/recruitment/constants';
import {
  ensureClienteFromAuth,
  isProfileComplete,
  profileMissingLabels,
} from '@/lib/data/cliente';

export const metadata = { title: 'Mi cuenta | AppSalon Pro' };

interface CitaRow {
  id: string;
  servicio: string;
  estado: string;
  fecha_hora: string;
  precio: number | null;
  notas_servicio: string | null;
  visita_qr_token: string | null;
  visita_validada_en: string | null;
  sucursal_id: string | null;
}

interface PedidoRow {
  id: string;
  tracking_code: string | null;
  status: string;
  total_amount: number | null;
  payment_method: string | null;
  fulfillment_type: string | null;
  created_at: string;
}

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab =
    tab === 'pedidos' || tab === 'citas' ? (tab as 'pedidos' | 'citas') : undefined;

  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/cuenta');

  let citas: CitaRow[] = [];
  let pedidos: PedidoRow[] = [];
  let clienteNombre = displayNameFromUser(user);
  let profileComplete = false;
  let missing: string[] = [];
  let joinTeamEstado: JoinTeamEstado | null = null;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createSupabaseServerClient();
      const { row } = await ensureClienteFromAuth(supabase, user);
      if (row?.nombre?.trim()) clienteNombre = row.nombre.trim();
      profileComplete = isProfileComplete(row);
      missing = profileMissingLabels(row);

      const { data: joinStatus } = await supabase.rpc('get_unete_equipo_status');
      const joinPayload = (joinStatus || {}) as {
        solicitud?: { estado?: JoinTeamEstado } | null;
      };
      if (joinPayload.solicitud?.estado) {
        joinTeamEstado = joinPayload.solicitud.estado;
      }

      if (row?.id) {
        const { data } = await supabase
          .from('citas')
          .select(
            'id,servicio,estado,fecha_hora,precio,notas_servicio,visita_qr_token,visita_validada_en,sucursal_id',
          )
          .eq('cliente_id', row.id)
          .order('fecha_hora', { ascending: false })
          .limit(6);
        citas = (data ?? []) as CitaRow[];
      }

      const { data: pedidosData } = await supabase
        .from('ecommerce_orders')
        .select(
          'id,tracking_code,status,total_amount,payment_method,fulfillment_type,created_at,notes',
        )
        .eq('client_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8);
      pedidos = (pedidosData ?? []) as PedidoRow[];
    } catch {
      citas = [];
      pedidos = [];
    }
  }

  const firstName = clienteNombre.split(/\s+/)[0] ?? 'cliente';

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Mi cuenta"
        title={`Hola, ${firstName}`}
        subtitle={
          profileComplete
            ? 'Gestiona tus citas y descubre nuevos productos.'
            : 'Completa tu perfil para que el salón te reconozca en citas y pedidos.'
        }
      />

      {joinTeamEstado ? (
        <div className="mb-8 rounded-2xl border border-border bg-surface px-4 py-3">
          <div className="flex gap-3">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-cream">Únete al Equipo</p>
                  <p className="text-xs text-muted">Estado de tu postulación</p>
                </div>
                <Link
                  href="/unete-al-equipo"
                  className="shrink-0 text-xs text-gold hover:underline"
                >
                  Ver detalle
                </Link>
              </div>
              <JoinTeamStatusBadge estado={joinTeamEstado} />
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <Link
            href="/unete-al-equipo"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-foreground hover:border-gold hover:text-gold"
          >
            <Users className="h-4 w-4" /> Únete al Equipo
          </Link>
        </div>
      )}

      {!profileComplete && (
        <Link
          href="/cuenta/perfil?from=/cuenta"
          className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 transition-colors hover:border-amber-500/50"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-medium text-cream">Completá tu perfil</p>
            <p className="mt-1 text-sm text-muted">
              Falta: {missing.slice(0, 3).join(', ')}. Es la misma ficha que usa
              la app Clientes en el salón.
            </p>
          </div>
        </Link>
      )}

      <WebPushOptInCard />

      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/reservar"
          className="flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal hover:bg-gold-soft"
        >
          <CalendarClock className="h-4 w-4" /> Nueva cita
        </Link>
        <Link
          href="/productos"
          className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-foreground hover:border-gold hover:text-gold"
        >
          <ShoppingBag className="h-4 w-4" /> Ir a la tienda
        </Link>
        <Link
          href="/cuenta/perfil"
          className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-foreground hover:border-gold hover:text-gold"
        >
          <UserPen className="h-4 w-4" /> Editar perfil
        </Link>
      </div>

      <CuentaPedidosCitasPanels pedidos={pedidos} citas={citas} initialTab={initialTab} />
    </div>
  );
}
