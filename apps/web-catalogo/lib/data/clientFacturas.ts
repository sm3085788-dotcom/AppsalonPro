import type { SupabaseClient } from '@supabase/supabase-js';

export interface ClienteVentaRow {
  id: string;
  no_factura: string | null;
  fecha: string | null;
  total: number | null;
  monto: number | null;
  metodo_pago: string | null;
  profesional: string | null;
  cliente_nombre: string | null;
  notas: string | null;
  detalles_pago: string | null;
  items: unknown;
  [key: string]: unknown;
}

export async function fetchMisFacturas(
  supabase: SupabaseClient,
  limit = 200,
): Promise<{ data: ClienteVentaRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc('client_mis_facturas', {
    p_limit: Math.min(Math.max(limit, 1), 500),
  });

  if (error) {
    const msg = error.message || 'No se pudieron cargar tus facturas.';
    if (msg.includes('row-level security') || msg.includes('client_mis_facturas')) {
      return {
        data: [],
        error:
          'Permiso denegado al leer facturas. Contactá al salón si el problema continúa.',
      };
    }
    return { data: [], error: msg };
  }

  return { data: (data as ClienteVentaRow[]) || [], error: null };
}
