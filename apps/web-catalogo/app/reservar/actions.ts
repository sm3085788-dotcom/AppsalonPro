'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  bookingSlotValidationError,
  getSlotStartFromInstant,
  instantFromDateAndSlotGT,
  zonedCalendarDateString,
} from '@/lib/bookingSlots';
import type { FulfillmentType, UUID } from '@/lib/types/db';

export interface CreateBookingInput {
  servicioId: UUID;
  servicio: string;
  fechaHora: string;
  sucursalId: UUID;
  fulfillment: FulfillmentType;
  latitud?: number | null;
  longitud?: number | null;
  direccion?: string | null;
}

export type CreateBookingResult =
  | { ok: true; id: UUID; estado: string }
  | { ok: false; error: string };

/**
 * Crea una cita (estado pendiente) vinculada al cliente del usuario actual.
 * El cliente emite luego el broadcast liviano para notificar al APK (Req 2).
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Inicia sesión para reservar.' };

    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!cliente?.id) {
      return {
        ok: false,
        error:
          'Completa tu perfil en Mi cuenta antes de reservar desde la web.',
      };
    }

    const fecha = new Date(input.fechaHora);
    const slotErr = bookingSlotValidationError(fecha);
    if (slotErr) return { ok: false, error: slotErr };

    const slot = getSlotStartFromInstant(fecha);
    if (!slot) return { ok: false, error: 'Fecha u hora inválida.' };

    const normalized = instantFromDateAndSlotGT(
      zonedCalendarDateString(fecha),
      slot,
    )!.toISOString();

    const { data: inv } = await supabase
      .from('inventario')
      .select('precio_venta')
      .eq('id', input.servicioId)
      .maybeSingle();

    const esDomicilio = input.fulfillment === 'domicilio';

    const { data, error } = await supabase
      .from('citas')
      .insert({
        cliente_id: cliente.id,
        servicio: input.servicio,
        precio: Number(inv?.precio_venta ?? 0),
        duracion_minutos: 60,
        fecha_hora: normalized,
        estado: 'pendiente',
        sucursal_id: input.sucursalId,
        latitud: esDomicilio ? (input.latitud ?? null) : null,
        longitud: esDomicilio ? (input.longitud ?? null) : null,
        direccion_domicilio: esDomicilio ? (input.direccion ?? null) : null,
      })
      .select('id,estado')
      .single();

    if (error || !data) {
      return { ok: false, error: 'No se pudo crear la cita. Intenta de nuevo.' };
    }

    return { ok: true, id: data.id as UUID, estado: data.estado as string };
  } catch {
    return { ok: false, error: 'Error inesperado al reservar.' };
  }
}
