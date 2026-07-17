'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { BookingCancelButton } from '@/components/booking/BookingCancelButton';
import { BookingSlotPicker } from '@/components/booking/BookingSlotPicker';
import {
  clientePuedeModificarCita,
  clientePuedeCancelarCita,
  citaEstaCancelada,
  citaEstaCompletada,
  citaEstaConfirmada,
} from '@/lib/citaCliente';

export function BookingCitaActions({
  citaId,
  fechaHora,
  estado,
  servicio,
  hasDeposit,
  depositGtq,
  visitaValidadaEn = null,
  sucursalId = null,
  branchPhone = null,
}: {
  citaId: string;
  fechaHora: string;
  estado: string;
  servicio?: string;
  hasDeposit: boolean;
  depositGtq?: number | null;
  visitaValidadaEn?: string | null;
  sucursalId?: string | null;
  branchPhone?: string | null;
}) {
  const router = useRouter();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newFechaHora, setNewFechaHora] = useState<string | null>(fechaHora);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (citaEstaCancelada(estado) || citaEstaCompletada(estado)) {
    return null;
  }

  if (!clientePuedeModificarCita(estado)) {
    if (citaEstaConfirmada(estado) && clientePuedeCancelarCita(estado, visitaValidadaEn)) {
      return (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href="/reservar"
              className="inline-flex rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:border-gold/60 hover:bg-gold/15"
            >
              Agendar otra cita
            </Link>
            {hasDeposit ? (
              <BookingCancelButton
                citaId={citaId}
                fechaHora={fechaHora}
                estado={estado}
                hasDeposit={hasDeposit}
                servicio={servicio}
                depositGtq={depositGtq}
                inline
              />
            ) : (
              <button
                type="button"
                onClick={() => void cancelSimple()}
                disabled={loading}
                className="inline-flex rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:border-red-400/60 hover:bg-red-500/15 disabled:opacity-60"
              >
                {loading ? 'Cancelando…' : 'Cancelar cita'}
              </button>
            )}
          </div>
          {error ? <p className="mt-2 text-[11px] text-red-300">{error}</p> : null}
        </>
      );
    }
    return null;
  }

  async function cancelSimple() {
    if (!window.confirm(`¿Cancelar ${servicio || 'esta cita'}?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/booking/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citaId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo cancelar.');
        return;
      }
      router.refresh();
    } catch {
      setError('Error de red. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function saveReschedule() {
    if (!newFechaHora) {
      setError('Elegí fecha y hora.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/booking/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citaId, fechaHora: newFechaHora }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo reagendar.');
        return;
      }
      setRescheduleOpen(false);
      router.refresh();
    } catch {
      setError('Error de red. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      {!rescheduleOpen ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setNewFechaHora(fechaHora);
              setRescheduleOpen(true);
            }}
            disabled={loading}
            className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:border-gold/60 hover:bg-gold/15 disabled:opacity-60"
          >
            Reagendar
          </button>
          {!hasDeposit ? (
            <button
              type="button"
              onClick={() => void cancelSimple()}
              disabled={loading}
              className="rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:border-red-400/60 hover:bg-red-500/15 disabled:opacity-60"
            >
              {loading ? 'Cancelando…' : 'Cancelar'}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-charcoal/60 p-3">
          <p className="text-xs font-medium text-cream">Nueva fecha y hora</p>
          <div className="mt-2">
            <BookingSlotPicker
              value={newFechaHora}
              onChange={setNewFechaHora}
              sucursalId={sucursalId}
              branchPhone={branchPhone}
              disabled={loading}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveReschedule()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-charcoal hover:bg-gold-soft disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setRescheduleOpen(false);
                setError(null);
              }}
              disabled={loading}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:text-cream disabled:opacity-60"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {hasDeposit ? (
        <BookingCancelButton
          citaId={citaId}
          fechaHora={fechaHora}
          estado={estado}
          hasDeposit={hasDeposit}
          servicio={servicio}
          depositGtq={depositGtq}
        />
      ) : null}

      {error ? <p className="mt-2 text-[11px] text-red-300">{error}</p> : null}

      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        El salón revisará tu solicitud y te confirmará la cita.
      </p>
    </div>
  );
}
