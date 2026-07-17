'use client';

import { useState } from 'react';
import { CalendarClock, ShoppingBag } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookingCitaActions } from '@/components/booking/BookingCitaActions';
import { CitaVisitaQrPanel } from '@/components/booking/CitaVisitaQrPanel';
import { PickupQrDisplay } from '@/components/tienda/PickupQrDisplay';
import { PedidoCancelButton } from '@/components/cuenta/PedidoCancelButton';
import { parseBookingNotas } from '@/lib/bookingPolicy';
import { formatCitaFechaHora, formatFechaHora, formatQ } from '@/lib/format';
import { citaEstadoBadgeClass } from '@/lib/citaEstadoBadge';
import { pedidoEstadoBadgeClass } from '@/lib/pedidoEstadoBadge';
import { needsPickupQr } from '@/lib/orderFulfillment';
import { clientePuedeCancelarPedido } from '@/lib/orders/pedidoCliente';

type PanelId = 'pedidos' | 'citas';

interface CitaItem {
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

interface PedidoItem {
  id: string;
  tracking_code: string | null;
  status: string;
  total_amount: number | null;
  payment_method: string | null;
  fulfillment_type: string | null;
  created_at: string;
}

function pedidoEstadoLabel(status: string): string {
  const s = String(status || '');
  if (s === 'pending') return 'Pendiente';
  if (s === 'confirmed') return 'Confirmado';
  if (s === 'prepared') return 'Listo';
  if (s === 'delivered') return 'Entregado';
  if (s === 'cancelled') return 'Cancelado';
  return s || '—';
}

function defaultPanel(pedidos: PedidoItem[], citas: CitaItem[]): PanelId {
  if (pedidos.length > 0 && citas.length === 0) return 'pedidos';
  if (citas.length > 0 && pedidos.length === 0) return 'citas';
  return 'pedidos';
}

function resolveInitialPanel(
  initialTab: PanelId | undefined,
  pedidos: PedidoItem[],
  citas: CitaItem[],
): PanelId {
  if (initialTab === 'pedidos' || initialTab === 'citas') return initialTab;
  return defaultPanel(pedidos, citas);
}

export function CuentaPedidosCitasPanels({
  pedidos,
  citas,
  initialTab,
}: {
  pedidos: PedidoItem[];
  citas: CitaItem[];
  initialTab?: PanelId;
}) {
  const [active, setActive] = useState<PanelId | null>(() =>
    resolveInitialPanel(initialTab, pedidos, citas),
  );

  function handleTabClick(id: PanelId) {
    setActive((prev) => (prev === id ? null : id));
  }

  const tabs: { id: PanelId; label: string; count: number; icon: typeof ShoppingBag }[] = [
    { id: 'pedidos', label: 'Mis pedidos', count: pedidos.length, icon: ShoppingBag },
    { id: 'citas', label: 'Mis citas', count: citas.length, icon: CalendarClock },
  ];

  return (
    <section>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {tabs.map(({ id, label, count, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleTabClick(id)}
              aria-expanded={isActive}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-left transition-colors sm:px-4 sm:py-3.5 ${
                isActive
                  ? 'border-gold/50 bg-gold/10 text-cream'
                  : 'border-border bg-surface text-muted hover:border-border-strong hover:text-cream'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-gold' : ''}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-tight">{label}</span>
                <span className={`text-xs ${isActive ? 'text-gold/80' : 'text-muted'}`}>
                  {count === 0 ? 'Sin registros' : `${count} ${count === 1 ? 'registro' : 'registros'}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {active ? (
        <div className="mt-4">
          {active === 'pedidos' ? (
            pedidos.length === 0 ? (
              <EmptyState
                title="Aún no tienes pedidos"
                description="Tus compras en la tienda web aparecerán aquí con su estado y código QR de retiro."
              />
            ) : (
              <ul className="space-y-3">
                {pedidos.map((p) => {
                  const showQr = needsPickupQr(p);
                  const canCancel = clientePuedeCancelarPedido(p.status);
                  return (
                    <li
                      key={p.id}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-cream">
                          {p.tracking_code || `Pedido ${p.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-muted">
                          {formatFechaHora(p.created_at)} · {p.payment_method || '—'} ·{' '}
                          {p.fulfillment_type === 'domicilio' ? 'Domicilio' : 'Retiro en salón'}
                        </p>
                        {canCancel ? <PedidoCancelButton orderId={p.id} /> : null}
                      </div>
                      {showQr && p.tracking_code ? (
                        <PickupQrDisplay
                          trackingCode={p.tracking_code}
                          compact
                          hint="Escanealo en salón"
                        />
                      ) : null}
                      <div className="shrink-0 text-right">
                        <span className={pedidoEstadoBadgeClass(p.status)}>
                          {pedidoEstadoLabel(p.status)}
                        </span>
                        {p.total_amount != null ? (
                          <p className="mt-1 text-sm text-foreground">{formatQ(p.total_amount)}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : citas.length === 0 ? (
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
                      <p className="text-xs text-muted">{formatCitaFechaHora(c.fecha_hora)}</p>
                      <BookingCitaActions
                        citaId={c.id}
                        fechaHora={c.fecha_hora}
                        estado={c.estado}
                        hasDeposit={hasDeposit && !refunded}
                        servicio={c.servicio}
                        depositGtq={c.precio ?? meta.deposit_gtq ?? null}
                        visitaValidadaEn={c.visita_validada_en}
                        sucursalId={c.sucursal_id}
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
                            <span className="block text-[11px] text-emerald-400">Reembolsado</span>
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
      ) : null}
    </section>
  );
}
