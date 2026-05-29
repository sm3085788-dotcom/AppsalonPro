import { supabase } from './supabaseClient.js';

/**
 * Facturas del cliente autenticado (RPC opcional + SELECT por cliente_id).
 */
export async function fetchClientMisFacturas(limit = 200) {
  const { data: rpcData, error: rpcError } = await supabase.rpc('client_mis_facturas', {
    p_limit: limit,
  });
  if (!rpcError && Array.isArray(rpcData)) {
    return { data: rpcData, error: null };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData?.session?.user?.id;
  if (!uid) {
    return { data: [], error: { message: 'Sin sesión' } };
  }

  const { data: cliente, error: cErr } = await supabase
    .from('clientes')
    .select('id')
    .eq('user_id', uid)
    .maybeSingle();
  if (cErr || !cliente?.id) {
    return {
      data: [],
      error: cErr || {
        message: 'Sin ficha de cliente vinculada a tu cuenta.',
      },
    };
  }

  const { data, error } = await supabase
    .from('ventas')
    .select('*')
    .eq('cliente_id', cliente.id)
    .order('fecha', { ascending: false })
    .limit(Math.min(limit, 500));

  if (error) {
    if (error.message?.includes('row-level security')) {
      return {
        data: [],
        error: {
          message:
            'Permiso denegado al leer facturas. Ejecutá supabase-client-mis-facturas.sql en Supabase (SQL Editor).',
        },
      };
    }
    return { data: [], error };
  }

  return { data: data || [], error: null };
}
