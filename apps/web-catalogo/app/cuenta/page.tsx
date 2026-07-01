import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarClock, ShoppingBag } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookingCancelButton } from '@/components/booking/BookingCancelButton';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { parseBookingNotas } from '@/lib/bookingPolicy';
import { formatFechaHora, formatQ } from '@/lib/format';

export const metadata = { title: 'Mi cuenta | AppSalon Pro' };

interface CitaRow {
  id: string;
  servicio: string;
  estado: string;
  fecha_hora: string;
  precio: number | null;
  notas_servicio: string | null;
}

export default async function CuentaPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/cuenta');

  let citas: CitaRow[] = [];
  if (isSupabaseConfigured) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cliente?.id) {
        const { data } = await supabase
          .from('citas')
          .select('id,servicio,estado,fecha_hora,precio,notas_servicio')
          .eq('cliente_id', cliente.id)
          .order('fecha_hora', { ascending: false })
          .limit(10);
        citas = (data ?? []) as CitaRow[];
      }
    } catch {
      citas = [];
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Mi cuenta"
        title={`Hola, ${user.email?.split('@')[0] ?? 'cliente'}`}
        subtitle="Gestiona tus citas y descubre nuevos productos."
      />

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
                className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-medium text-cream">{c.servicio}</p>
                  <p className="text-xs text-muted">
                    {formatFechaHora(c.fecha_hora)}
                  </p>
                  <BookingCancelButton
                    citaId={c.id}
                    fechaHora={c.fecha_hora}
                    estado={c.estado}
                    hasDeposit={hasDeposit && !refunded}
                  />
                </div>
                <div className="shrink-0 text-right">
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs capitalize text-gold">
                    {c.estado}
                  </span>
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
