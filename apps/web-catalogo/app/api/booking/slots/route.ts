import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseAdminConfigured, isSupabaseConfigured } from '@/lib/env';
import {
  generateBookingSlots,
  buildSlotDensityMap,
  buildServicioCategoriaLookup,
  formatBookingSlotLabel,
  dayInstantRangeForCalendarDate,
  zonedCalendarDateString,
  CITA_CONGESTION_THRESHOLD,
  normalizeServicioCategoria,
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

async function resolveCategoriaFilter(
  categoria: string | null,
  servicioId: string | null,
  servicio: string | null,
): Promise<string | null> {
  const direct = categoria?.trim();
  if (direct) return normalizeServicioCategoria(direct);

  if (!isSupabaseConfigured) return null;

  try {
    const supabase = await createSupabaseServerClient();

    if (servicioId) {
      const { data } = await supabase
        .from('inventario')
        .select('categoria')
        .eq('id', servicioId)
        .maybeSingle();
      if (data?.categoria) return normalizeServicioCategoria(String(data.categoria));
    }

    const servicioName = servicio?.trim();
    if (servicioName) {
      const { data } = await supabase
        .from('inventario')
        .select('categoria')
        .ilike('nombre', servicioName)
        .maybeSingle();
      if (data?.categoria) return normalizeServicioCategoria(String(data.categoria));
    }
  } catch {
    return null;
  }

  return null;
}

async function densityFromRpc(
  date: string,
  sucursalId: string,
  categoria: string | null,
): Promise<Record<string, number> | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('get_booking_slot_density', {
      p_date: date,
      p_sucursal_id: sucursalId,
      p_categoria: categoria,
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
  categoria: string | null,
  useAdmin: boolean,
): Promise<Record<string, number> | null> {
  const { start, end } = dayInstantRangeForCalendarDate(date);
  if (!start || !end) return null;

  const client = useAdmin
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  const { data: citas, error } = await client
    .from('citas')
    .select(
      'id,fecha_hora,estado,sucursal_id,visita_validada_en,duracion_minutos,servicio,notas_servicio',
    )
    .eq('sucursal_id', sucursalId)
    .gte('fecha_hora', start)
    .lte('fecha_hora', end);

  if (error) {
    console.warn('[booking/slots] citas query', error.message);
    return null;
  }

  let servicioLookup: ReturnType<typeof buildServicioCategoriaLookup> | undefined;
  if (categoria) {
    const { data: inventario } = await client
      .from('inventario')
      .select('id,nombre,categoria')
      .not('nombre', 'is', null);
    servicioLookup = buildServicioCategoriaLookup(inventario ?? []);
  }

  const rows = (citas ?? []).filter(
    (row) => zonedCalendarDateString(row.fecha_hora) === date,
  );
  const density = buildSlotDensityMap(rows, date, sucursalId, {
    ...(categoria ? { categoria } : {}),
    ...(servicioLookup ? { servicioLookup } : {}),
  }) as Record<string, { count: number; congested: boolean }>;

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
    const categoriaParam = searchParams.get('categoria')?.trim() || null;
    const servicioId = searchParams.get('servicioId')?.trim() || null;
    const servicio = searchParams.get('servicio')?.trim() || null;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Parámetro date inválido (YYYY-MM-DD).' }, { status: 400 });
    }
    if (!sucursalId) {
      return NextResponse.json({ error: 'sucursalId es obligatorio.' }, { status: 400 });
    }

    await expireNoShowCitas();

    const categoria = await resolveCategoriaFilter(categoriaParam, servicioId, servicio);

    // RPC (SECURITY DEFINER) funciona sin service role; JS enriquece si hay admin y el RPC falla.
    let countBySlot =
      (await densityFromRpc(date, sucursalId, categoria)) ??
      (isSupabaseAdminConfigured
        ? await densityFromCitasRows(date, sucursalId, categoria, true)
        : null) ??
      (isSupabaseConfigured
        ? await densityFromCitasRows(date, sucursalId, categoria, false)
        : null);

    const densityAvailable = countBySlot != null;
    if (!countBySlot) countBySlot = {};

    const slots = densityAvailable
      ? slotsFromCountMap(countBySlot)
      : emptySlots();

    return NextResponse.json({ slots, densityAvailable, categoria });
  } catch (err) {
    console.error('[booking/slots]', err);
    return NextResponse.json({ error: 'Error al consultar franjas.' }, { status: 500 });
  }
}
