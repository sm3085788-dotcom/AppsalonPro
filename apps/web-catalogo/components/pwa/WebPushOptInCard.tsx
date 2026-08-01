'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import {
  getExistingPushSubscription,
  isWebPushSupported,
  subscribeWebPush,
  subscriptionToPayload,
  unsubscribeWebPush,
} from '@/lib/push/client';

type Status = 'loading' | 'unsupported' | 'off' | 'on' | 'denied';

export function WebPushOptInCard() {
  const [status, setStatus] = useState<Status>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    if (!isWebPushSupported()) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    try {
      const sub = await getExistingPushSubscription();
      setStatus(sub ? 'on' : 'off');
    } catch {
      setStatus('off');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const sub = await subscribeWebPush();
      const payload = subscriptionToPayload(sub);
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'No se pudo guardar la suscripción.');
      }
      setStatus('on');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const sub = await getExistingPushSubscription();
      const endpoint = sub?.endpoint;
      await unsubscribeWebPush();
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
      setStatus('off');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desactivar.');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="mb-8 flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Comprobando avisos…
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <div className="mb-8 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        Tu navegador no admite avisos push. En iPhone, añade Andreas a la pantalla de
        inicio (PWA) para poder recibirlos.
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-border bg-surface px-4 py-4">
      <div className="flex items-start gap-3">
        {status === 'on' ? (
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
        ) : (
          <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cream">Avisos de citas</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {status === 'denied'
              ? 'Los avisos están bloqueados en el navegador. Actívalos en Ajustes del sitio.'
              : status === 'on'
                ? 'Recibirás una alerta en el teléfono cuando el salón confirme tu cita, incluso con la web cerrada.'
                : 'Activa avisos para enterarte al instante cuando el salón confirme tu cita (teléfono bloqueado / web cerrada).'}
          </p>
          {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
          {status !== 'denied' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void (status === 'on' ? disable() : enable())}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-gold transition-colors hover:bg-gold hover:text-charcoal disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {status === 'on' ? 'Desactivar avisos' : 'Activar avisos'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
