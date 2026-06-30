'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/env';
import type { BookingBroadcast, BookingStatus, UUID } from '@/lib/types/db';

export type RealtimeConnState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

interface Options {
  /** Sucursal a escuchar. Si es null/'' no se suscribe. */
  branchId: UUID | null;
  /** Callback al recibir un evento liviano {booking_id, estado}. */
  onBooking?: (payload: BookingBroadcast) => void;
  /** Recibir tambien los eventos emitidos por este mismo cliente. */
  echo?: boolean;
}

/** Nombre de canal por sucursal. Compartido con el listener del APK. */
export function branchChannelName(branchId: UUID) {
  return `branch:${branchId}`;
}

export const BOOKING_EVENT = 'booking';

/**
 * Req 2 (web): escucha en tiempo real las citas de UNA sucursal via Supabase
 * Broadcast. El payload es minimo ({booking_id, estado}) para ahorrar datos.
 * Incluye reconexion automatica con backoff exponencial.
 */
export function useBranchBookingsRealtime({
  branchId,
  onBooking,
  echo = false,
}: Options) {
  const [state, setState] = useState<RealtimeConnState>('idle');
  const [lastEvent, setLastEvent] = useState<BookingBroadcast | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBookingRef = useRef(onBooking);
  onBookingRef.current = onBooking;

  const clearReconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!branchId || !isSupabaseConfigured) {
      setState('idle');
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      setState(retriesRef.current === 0 ? 'connecting' : 'reconnecting');

      const channel = supabase.channel(branchChannelName(branchId), {
        config: { broadcast: { self: echo, ack: true } },
      });

      channel.on('broadcast', { event: BOOKING_EVENT }, ({ payload }) => {
        const data = payload as BookingBroadcast;
        if (!data?.booking_id) return;
        setLastEvent(data);
        onBookingRef.current?.(data);
      });

      channel.subscribe((status) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') {
          retriesRef.current = 0;
          setState('connected');
          return;
        }
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          setState('reconnecting');
          scheduleReconnect();
        }
      });

      channelRef.current = channel;
    };

    const scheduleReconnect = () => {
      clearReconnect();
      const attempt = Math.min(retriesRef.current + 1, 6);
      retriesRef.current = attempt;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 30_000);
      reconnectTimer.current = setTimeout(() => {
        if (cancelled) return;
        const ch = channelRef.current;
        if (ch) supabase.removeChannel(ch);
        connect();
      }, delay);
    };

    connect();

    return () => {
      cancelled = true;
      clearReconnect();
      const ch = channelRef.current;
      if (ch) supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [branchId, echo, clearReconnect]);

  /**
   * Emisor liviano: publica {booking_id, estado} en el canal de la sucursal.
   * La web lo llama tras crear/actualizar una cita para notificar al APK.
   */
  const emitBooking = useCallback(
    async (bookingId: UUID, estado: BookingStatus) => {
      const ch = channelRef.current;
      if (!ch) return;
      await ch.send({
        type: 'broadcast',
        event: BOOKING_EVENT,
        payload: { booking_id: bookingId, estado } satisfies BookingBroadcast,
      });
    },
    [],
  );

  return { state, lastEvent, emitBooking };
}
