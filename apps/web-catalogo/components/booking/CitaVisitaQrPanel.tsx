'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  citaEstaConfirmada,
  citaNecesitaValidacionVisita,
} from '@/lib/citaCliente';
import { visitaQrImageUrl } from '@/lib/visitaQr';
import { ExpandableCompactQr } from '@/components/ui/ExpandableCompactQr';

export function CitaVisitaQrPanel({
  citaId,
  estado,
  visitaQrToken,
  visitaValidadaEn,
}: {
  citaId: string;
  estado: string;
  visitaQrToken: string | null;
  visitaValidadaEn: string | null;
}) {
  const [token, setToken] = useState(() => String(visitaQrToken || '').trim());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsQr = citaNecesitaValidacionVisita(estado, visitaValidadaEn);
  const confirmada = citaEstaConfirmada(estado);

  const cargarQr = useCallback(async () => {
    if (!citaId || !needsQr) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/booking/visita-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citaId }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'No se pudo generar el QR.');
        return;
      }
      if (data.token) {
        setToken(String(data.token).trim());
      }
    } catch {
      setError('Error de red. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [citaId, needsQr]);

  useEffect(() => {
    setToken(String(visitaQrToken || '').trim());
    setError(null);
  }, [citaId, visitaQrToken, visitaValidadaEn]);

  useEffect(() => {
    if (!needsQr || token) return;
    void cargarQr();
  }, [needsQr, token, cargarQr]);

  if (!confirmada) return null;

  if (visitaValidadaEn) {
    return (
      <div className="flex shrink-0 flex-col items-center justify-center px-2 text-center">
        <p className="text-[10px] font-medium leading-tight text-emerald-400">
          Visita validada
        </p>
      </div>
    );
  }

  if (!needsQr) return null;

  const qrUrl = visitaQrImageUrl(token, 88);
  const qrUrlLarge = visitaQrImageUrl(token, 280);

  return (
    <div className="flex shrink-0 flex-col items-center justify-center px-2">
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-muted" aria-hidden />
      ) : qrUrl ? (
        <ExpandableCompactQr
          src={qrUrl}
          srcLarge={qrUrlLarge || qrUrl}
          alt="Código QR de visita"
          hint="Escanealo en salón"
        />
      ) : (
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="max-w-[7rem] text-[10px] leading-tight text-red-300">
            {error || 'No se pudo cargar el QR.'}
          </p>
          <button
            type="button"
            onClick={() => void cargarQr()}
            disabled={loading}
            className="text-[10px] font-medium text-gold underline-offset-2 hover:underline disabled:opacity-60"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
