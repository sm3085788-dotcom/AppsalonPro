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

export function WebPushBellButton() {
  const [status, setStatus] = useState<Status>('loading');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
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
    } catch {
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (busy) return;
    setBusy(true);
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
    } catch {
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onToggle = () => {
    if (busy || status === 'loading' || status === 'unsupported' || status === 'denied') {
      return;
    }
    void (status === 'on' ? disable() : enable());
  };

  if (status === 'unsupported' || status === 'loading') {
    return null;
  }

  const isOn = status === 'on';
  const Icon = isOn ? Bell : BellOff;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy || status === 'denied'}
      aria-label={
        status === 'denied'
          ? 'Avisos bloqueados en el navegador'
          : isOn
            ? 'Desactivar avisos de citas'
            : 'Activar avisos de citas'
      }
      aria-pressed={isOn}
      title={
        status === 'denied'
          ? 'Avisos bloqueados — actívalos en ajustes del sitio'
          : isOn
            ? 'Avisos activos'
            : 'Activar avisos de citas'
      }
      className={`rounded-full border p-2 transition-colors disabled:opacity-50 ${
        isOn
          ? 'border-red-500/50 bg-red-500/10 text-red-500 hover:border-red-400 hover:text-red-400'
          : 'border-white/15 text-pearl hover:border-border-strong hover:text-cream'
      }`}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      ) : (
        <Icon className="h-5 w-5" aria-hidden />
      )}
    </button>
  );
}
