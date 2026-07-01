'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { bookingRefundEligible } from '@/lib/bookingPolicy';

export function BookingCancelButton({
  citaId,
  fechaHora,
  estado,
  hasDeposit,
}: {
  citaId: string;
  fechaHora: string;
  estado: string;
  hasDeposit: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasDeposit || estado === 'cancelada' || estado === 'completada') {
    return null;
  }

  const eligible = bookingRefundEligible(fechaHora);

  async function onCancel() {
    if (!eligible) return;
    if (
      !window.confirm(
        '¿Cancelar tu cita? Recibirás el reembolso automático del anticipo en tu tarjeta.',
      )
    ) {
      return;
    }
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

  return (
    <div className="mt-2">
      {eligible ? (
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="text-xs text-red-300 underline-offset-2 hover:underline disabled:opacity-60"
        >
          {loading ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Cancelando…
            </span>
          ) : (
            'Cancelar con reembolso'
          )}
        </button>
      ) : (
        <p className="text-[11px] text-muted">
          Ya no aplica reembolso (menos de 24 h). Si no asistís, pierdes el anticipo.
        </p>
      )}
      {error && <p className="mt-1 text-[11px] text-red-300">{error}</p>}
    </div>
  );
}
