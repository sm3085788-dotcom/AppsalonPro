'use client';

import { useMemo } from 'react';
import { Gift, Receipt, X } from 'lucide-react';
import type { ClienteVentaRow } from '@/lib/data/clientFacturas';
import { formatQ } from '@/lib/format';
import {
  extractGiftCardFromVenta,
  facturaLabel,
  formatDetallesPagoDisplay,
  formatFechaVenta,
  formatMetodoPago,
  formatVentaNotasParaDisplay,
  montoVenta,
  parseVentaItems,
  profesionalLabel,
} from '../../../../shared/utils/ventaFactura.js';

export function FacturaDetalleSheet({
  venta,
  clienteNombre,
  onClose,
}: {
  venta: ClienteVentaRow;
  clienteNombre?: string | null;
  onClose: () => void;
}) {
  const items = useMemo(() => parseVentaItems(venta.items), [venta.items]);
  const notasDisplay = useMemo(() => formatVentaNotasParaDisplay(venta.notas), [venta.notas]);
  const giftInfo = useMemo(() => extractGiftCardFromVenta(venta), [venta]);
  const detallePago = useMemo(
    () => formatDetallesPagoDisplay(venta.detalles_pago),
    [venta.detalles_pago],
  );

  const nombreCliente =
    venta.cliente_nombre?.trim() || clienteNombre?.trim() || '—';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="factura-detalle-title"
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-border bg-charcoal shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p id="factura-detalle-title" className="text-sm font-medium text-cream">
              Detalle de factura
            </p>
            <p className="mt-0.5 truncate font-serif text-lg text-gold">{facturaLabel(venta)}</p>
            <p className="text-xs text-muted">{formatFechaVenta(venta.fecha)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full border border-border p-2 text-muted hover:text-cream"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-5rem)] overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-gold/25 bg-gold/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Total cobrado</p>
            <p className="mt-1 text-2xl font-light text-cream">{formatQ(montoVenta(venta))}</p>
          </div>

          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-muted">Cliente</dt>
              <dd className="mt-0.5 text-cream">{nombreCliente}</dd>
            </div>
            {profesionalLabel(venta) ? (
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-muted">Atendido por</dt>
                <dd className="mt-0.5 text-cream">{profesionalLabel(venta)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-muted">Método de pago</dt>
              <dd className="mt-0.5 text-cream">{formatMetodoPago(venta.metodo_pago)}</dd>
            </div>
          </dl>

          {giftInfo?.codigo ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-gold/30 bg-surface px-3 py-2 text-xs text-gold">
              <Gift className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                Tarjeta regalo · {giftInfo.codigo}
                {giftInfo.monto != null ? ` · ${formatQ(giftInfo.monto)}` : ''}
              </span>
            </div>
          ) : null}

          {detallePago ? (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Desglose de pago</p>
              <p className="mt-1 whitespace-pre-line text-sm text-cream">{detallePago}</p>
            </div>
          ) : null}

          {items.length > 0 ? (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-gold" aria-hidden />
                <p className="text-xs uppercase tracking-[0.14em] text-muted">Artículos</p>
              </div>
              <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
                {items.map((line) => (
                  <li key={line.key} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-cream">{line.nombre}</p>
                      <p className="text-xs text-muted">
                        {line.cantidad} × {formatQ(line.precio_unitario)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-cream">{formatQ(line.subtotal)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {notasDisplay ? (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Notas</p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted">{notasDisplay}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
