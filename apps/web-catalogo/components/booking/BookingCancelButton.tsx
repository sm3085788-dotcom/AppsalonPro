'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X, AlertTriangle } from 'lucide-react';
import {
  bookingRefundEligible,
  bookingDepositPolicyText,
  bookingRefundTooLateMessage,
  bookingRefundDeadlineIso,
  BOOKING_REFUND_HOURS_BEFORE,
} from '@/lib/bookingPolicy';
import { formatFechaHora, formatQ } from '@/lib/format';

export function BookingCancelButton({
  citaId,
  fechaHora,
  estado,
  hasDeposit,
  servicio,
  depositGtq,
}: {
  citaId: string;
  fechaHora: string;
  estado: string;
  hasDeposit: boolean;
  servicio?: string;
  depositGtq?: number | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (!hasDeposit || estado === 'cancelada' || estado === 'completada') {
    return null;
  }

  const eligible = bookingRefundEligible(fechaHora);
  const deadlineIso = bookingRefundDeadlineIso(fechaHora);
  const policyText = bookingDepositPolicyText();
  const h = BOOKING_REFUND_HOURS_BEFORE as number;
  const horasLabel = h === 1 ? '1 hora' : `${h} horas`;

  async function confirmCancel() {
    if (!eligible) return;
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
      setModalOpen(false);
      router.refresh();
    } catch {
      setError('Error de red. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mt-3">
        {eligible ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            disabled={loading}
            className="rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:border-red-400/60 hover:bg-red-500/15 disabled:opacity-60"
          >
            Cancelar cita
          </button>
        ) : (
          <p className="text-[11px] leading-relaxed text-muted">
            {bookingRefundTooLateMessage()}
          </p>
        )}
        {error && !modalOpen && (
          <p className="mt-1 text-[11px] text-red-300">{error}</p>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-booking-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-charcoal p-5 shadow-xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-gold">
                  Cancelar cita
                </p>
                <h3
                  id="cancel-booking-title"
                  className="mt-1 text-lg font-light text-cream"
                >
                  {servicio || 'Tu reserva'}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  {formatFechaHora(fechaHora)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !loading && setModalOpen(false)}
                aria-label="Cerrar"
                className="rounded-full border border-border p-1.5 text-muted hover:text-cream"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {depositGtq != null && depositGtq > 0 && (
              <p className="mb-3 text-sm text-foreground">
                Anticipo pagado:{' '}
                <span className="font-medium text-gold">{formatQ(depositGtq)}</span>
              </p>
            )}

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Política de cancelación
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted">{policyText}</p>
              {deadlineIso && (
                <p className="mt-2 text-xs text-cream">
                  Reembolso disponible hasta:{' '}
                  <span className="text-gold">{formatFechaHora(deadlineIso)}</span>
                  {' '}({horasLabel} antes de la cita)
                </p>
              )}
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-300">{error}</p>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse sm:gap-3">
              <button
                type="button"
                onClick={confirmCancel}
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-red-600/90 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelando…
                  </>
                ) : (
                  'Confirmar cancelación y reembolso'
                )}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={loading}
                className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm text-muted transition-colors hover:border-border-strong hover:text-cream disabled:opacity-60"
              >
                Mantener cita
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
