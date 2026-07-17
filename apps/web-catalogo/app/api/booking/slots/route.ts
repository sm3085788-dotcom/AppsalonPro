import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseAdminConfigured, isSupabaseConfigured } from '@/lib/env';
import {
  generateBookingSlots,
  buildSlotDensityMap,
  formatBookingSlotLabel,
  dayInstantRangeForCalendarDate,
  zonedCalendarDateString,
  CITA_CONGESTION_THRESHOLD,
} from '@/lib/bookingSlots';

export interface BookingSlotOption {
  time: string;
  label: string;
  count: number;
  congested: boolean;
}

function emptySlots(): BookingSlotOption[] {
  return generateBookingSlots().map((time) => ({
    time,
    label: formatBookingSlotLabel(time),
    count: 0,
    congested: false,
  }));
}

function slotsFromCountMap(countBySlot: Record<string, number>): BookingSlotOption[] {
  return generateBookingSlots().map((time) => {
    const count = Number(countBySlot[time] ?? 0);
    const congested = count >= CITA_CONGESTION_THRESHOLD;
    return {
      time,
      label: formatBookingSlotLabel(time),
      count,
      congested,
    };
  });
}

async function expireNoShowCitas(): Promise<void> {
  if (!isSupabaseAdminConfigured) return;
  try {
    const admin = createSupabaseAdminClient();
    await admin.rpc('expire_citas_sin_asistencia');
  } catch (err) {
    console.warn('[booking/slots] expire_citas_sin_asistencia', err);
  }
}

async function densityFromRpc(
  date: string,
  sucursalId: string,
): Promise<Record<string, number> | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('get_booking_slot_density', {
      p_date: date,
      p_sucursal_id: sucursalId,
    });
    if (error) {
      console.warn('[booking/slots] RPC get_booking_slot_density', error.message);
      return null;
    }
    if (!data || typeof data !== 'object') return null;
    return data as Record<string, number>;
  } catch {
    return null;
  }
}

async function densityFromCitasRows(
  date: string,
  sucursalId: string,
  useAdmin: boolean,
): Promise<Record<string, number> | null> {
  const { start, end } = dayInstantRangeForCalendarDate(date);
  if (!start || !end) return null;

  const client = useAdmin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  const { data: citas, error } = await client
    .from('citas')
    .select('id,fecha_hora,estado,sucursal_id,visita_validada_en,duracion_minutos')
    .eq('sucursal_id', sucursalId)
    .gte('fecha_hora', start)
    .lte('fecha_hora', end);

  if (error) {
    console.warn('[booking/slots] citas query', error.message);
    return null;
  }

  const rows = (citas ?? []).filter(
    (row) => zonedCalendarDateString(row.fecha_hora) === date,
  );
  const density = buildSlotDensityMap(rows, date, sucursalId) as Record<
    string,
    { count: number; congested: boolean }
  >;

  const countBySlot: Record<string, number> = {};
  for (const [time, entry] of Object.entries(density)) {
    countBySlot[time] = entry?.count ?? 0;
  }
  return countBySlot;
}

/** Densidad de franjas para un día y sucursal (reserva web). */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const date = searchParams.get('date')?.trim();
    const sucursalId = searchParams.get('sucursalId')?.trim();

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Parámetro date inválido (YYYY-MM-DD).' }, { status: 400 });
    }
    if (!sucursalId) {
      return NextResponse.json({ error: 'sucursalId es obligatorio.' }, { status: 400 });
    }

    await expireNoShowCitas();

    let countBySlot =
      (await densityFromRpc(date, sucursalId)) ??
      (isSupabaseAdminConfigured
        ? await densityFromCitasRows(date, sucursalId, true)
        : null) ??
      (isSupabaseConfigured
        ? await densityFromCitasRows(date, sucursalId, false)
        : null);

    const densityAvailable = countBySlot != null;
    if (!countBySlot) countBySlot = {};

    const slots = densityAvailable
      ? slotsFromCountMap(countBySlot)
      : emptySlots();

    return NextResponse.json({ slots, densityAvailable });
  } catch (err) {
    console.error('[booking/slots]', err);
    return NextResponse.json({ error: 'Error al consultar franjas.' }, { status: 500 });
  }
}
