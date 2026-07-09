import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '@/lib/env';
import type { BookingStatus, UUID } from '@/lib/types/db';

export const BOOKING_EVENT = 'booking';

export function branchChannelName(branchId: UUID) {
  return `branch:${branchId}`;
}

function realtimeClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  const key = env.supabaseServiceRoleKey || env.supabaseAnonKey;
  if (!key) return null;
  return createClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Notifica al APK App Salón (canal branch:<sucursal_id>). */
export async function emitSalonBookingBroadcast(
  branchId: UUID | null | undefined,
  bookingId: UUID,
  estado: BookingStatus,
): Promise<void> {
  if (!branchId) return;
  const supabase = realtimeClient();
  if (!supabase) return;

  await new Promise<void>((resolve) => {
    const channel = supabase.channel(branchChannelName(branchId), {
      config: { broadcast: { ack: false } },
    });
    const timeout = setTimeout(() => {
      void supabase.removeChannel(channel);
      resolve();
    }, 5000);

    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      void channel
        .send({
          type: 'broadcast',
          event: BOOKING_EVENT,
          payload: { booking_id: bookingId, estado },
        })
        .finally(() => {
          clearTimeout(timeout);
          void supabase.removeChannel(channel);
          resolve();
        });
    });
  });
}
