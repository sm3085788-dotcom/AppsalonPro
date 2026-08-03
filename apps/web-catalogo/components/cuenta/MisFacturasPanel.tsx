'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronRight, Gift, Loader2, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { FacturaDetalleSheet } from '@/components/cuenta/FacturaDetalleSheet';
import type { ClienteVentaRow } from '@/lib/data/clientFacturas';
import { formatQ } from '@/lib/format';
import {
  extractGiftCardFromVenta,
  facturaLabel,
  montoVenta,
  profesionalLabel,
} from '../../../../shared/utils/ventaFactura.js';

function formatFechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function MisFacturasPanel({
  initialFacturas,
  initialError,
  clienteNombre,
  hasCliente,
}: {
  initialFacturas: ClienteVentaRow[];
  initialError: string | null;
  clienteNombre?: string | null;
  hasCliente: boolean;
}) {
  const [facturas] = useState(initialFacturas);
  const [error] = useState(initialError);
  const [query, setQuery] = useState('');
  const [detalle, setDetalle] = useState<ClienteVentaRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return facturas;
    return facturas.filter((v) => {
      const gift = extractGiftCardFromVenta(v);
      const blob = [
        facturaLabel(v),
        v.metodo_pago,
        profesionalLabel(v),
        v.notas,
        gift?.codigo,
        v.detalles_pago,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [facturas, query]);

  const closeDetalle = useCallback(() => setDetalle(null), []);

  if (!hasCliente) {
    return (
      <EmptyState
        title="Sin ficha de cliente"
        description="Cuando tu cuenta esté vinculada a una ficha en el salón, aquí verás las facturas de tus compras y servicios."
      />
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar folio, método, notas…"
          aria-label="Buscar facturas"
          className="w-full rounded-xl border border-border bg-surface-2 py-2.5 pl-10 pr-3 text-sm text-foreground outline-none focus:border-gold"
        />
      </div>

      <p className="mt-3 text-xs text-muted">
        {filtered.length} factura{filtered.length === 1 ? '' : 's'}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Sin facturas aún"
            description="Cuando el salón registre el cobro de un pedido o servicio a tu nombre, la factura aparecerá aquí."
          />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {filtered.map((v) => {
            const prof = profesionalLabel(v) || 'Salón';
            const gift = extractGiftCardFromVenta(v);
            const subParts = [prof, formatFechaCorta(v.fecha), v.metodo_pago].filter(Boolean);

            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setDetalle(v)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-cream">{facturaLabel(v)}</p>
                      <p className="shrink-0 text-sm font-medium text-gold">{formatQ(montoVenta(v))}</p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {subParts.length ? subParts.join(' · ') : '—'}
                    </p>
                    {gift?.codigo ? (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/5 px-2 py-0.5 text-[10px] text-gold">
                        <Gift className="h-3 w-3" aria-hidden />
                        Tarjeta regalo · {gift.codigo}
                      </span>
                    ) : null}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {detalle ? (
        <FacturaDetalleSheet
          venta={detalle}
          clienteNombre={clienteNombre}
          onClose={closeDetalle}
        />
      ) : null}
    </>
  );
}

export function MisFacturasPanelLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      Cargando facturas…
    </div>
  );
}
