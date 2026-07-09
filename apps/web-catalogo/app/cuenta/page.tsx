import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarClock, ShoppingBag, UserPen, AlertCircle, Users } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookingCitaActions } from '@/components/booking/BookingCitaActions';
import { CitaVisitaQrPanel } from '@/components/booking/CitaVisitaQrPanel';
import { JoinTeamStatusBadge } from '@/components/recruitment/JoinTeamStatusBadge';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { parseBookingNotas } from '@/lib/bookingPolicy';
import { displayNameFromUser } from '@/lib/clientDisplayName';
import type { JoinTeamEstado } from '@/lib/recruitment/constants';
import {
  ensureClienteFromAuth,
  isProfileComplete,
  profileMissingLabels,
} from '@/lib/data/cliente';
import { formatFechaHora, formatQ } from '@/lib/format';
import { citaEstadoBadgeClass } from '@/lib/citaEstadoBadge';

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
}

export default async function CuentaPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/cuenta');

  let citas: CitaRow[] = [];
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
            'id,servicio,estado,fecha_hora,precio,notas_servicio,visita_qr_token,visita_validada_en',
          )
          .eq('cliente_id', row.id)
          .order('fecha_hora', { ascending: false })
          .limit(6);
        citas = (data ?? []) as CitaRow[];
      }
    } catch {
      citas = [];
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

      <h2 className="mb-4 text-xl font-light text-cream">Mis citas</h2>
      {citas.length === 0 ? (
        <EmptyState
          title="Aún no tienes citas"
          description="Reserva tu primera cita y aparecerá aquí."
        />
      ) : (
        <ul className="space-y-3">
          {citas.map((c) => {
            const { meta } = parseBookingNotas(c.notas_servicio);
            const hasDeposit = Boolean(meta.payment_intent_id);
            const refunded = Boolean(meta.refunded);

            return (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-cream">{c.servicio}</p>
                  <p className="text-xs text-muted">
                    {formatFechaHora(c.fecha_hora)}
                  </p>
                  <BookingCitaActions
                    citaId={c.id}
                    fechaHora={c.fecha_hora}
                    estado={c.estado}
                    hasDeposit={hasDeposit && !refunded}
                    servicio={c.servicio}
                    depositGtq={c.precio ?? meta.deposit_gtq ?? null}
                  />
                </div>
                <CitaVisitaQrPanel
                  citaId={c.id}
                  estado={c.estado}
                  visitaQrToken={c.visita_qr_token}
                  visitaValidadaEn={c.visita_validada_en}
                />
                <div className="shrink-0 text-right">
                  <span className={citaEstadoBadgeClass(c.estado)}>{c.estado}</span>
                  {c.precio != null && hasDeposit && (
                    <p className="mt-1 text-sm text-foreground">
                      Anticipo {formatQ(c.precio)}
                      {refunded && (
                        <span className="block text-[11px] text-emerald-400">
                          Reembolsado
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
