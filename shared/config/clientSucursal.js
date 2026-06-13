import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient.js';

const STORAGE_KEY = '@appsalon/clientes/sucursal_preferida_id';

export async function getClientSucursalId() {
  try {
    const local = await AsyncStorage.getItem(STORAGE_KEY);
    if (local) return local;
  } catch {
    // noop
  }
  try {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    if (!uid) return null;
    const { data: cliente } = await supabase
      .from('clientes')
      .select('sucursal_preferida_id')
      .eq('user_id', uid)
      .maybeSingle();
    return cliente?.sucursal_preferida_id || null;
  } catch {
    return null;
  }
}

/** Garantiza sucursal antes de agendar (AsyncStorage → perfil → matriz activa). */
export async function ensureClientSucursalId() {
  const existing = await getClientSucursalId();
  if (existing) return existing;
  try {
    const { data: rpcData } = await supabase.rpc('list_sucursales_activas');
    const list = Array.isArray(rpcData) ? rpcData : [];
    const matriz = list.find((s) => s.es_matriz) || list[0];
    if (matriz?.id) {
      await setClientSucursalId(matriz.id);
      return String(matriz.id);
    }
    const { data: direct } = await supabase
      .from('sucursales')
      .select('id, es_matriz')
      .eq('activa', true)
      .order('es_matriz', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (direct?.id) {
      await setClientSucursalId(direct.id);
      return String(direct.id);
    }
  } catch {
    // noop
  }
  return null;
}

export async function setClientSucursalId(sucursalId, { persistProfile = true } = {}) {
  const id = sucursalId ? String(sucursalId) : '';
  if (!id) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return { error: null };
  }
  await AsyncStorage.setItem(STORAGE_KEY, id);
  if (!persistProfile) return { error: null };
  try {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    if (!uid) return { error: null };
    const { error } = await supabase
      .from('clientes')
      .update({ sucursal_preferida_id: id })
      .eq('user_id', uid);
    return { error };
  } catch (e) {
    return { error: e };
  }
}

export function mergeInventarioWithSucursalStock(items, stockRows) {
  if (!Array.isArray(items) || !items.length) return items || [];
  const map = new Map((stockRows || []).map((r) => [String(r.inventario_id), r]));
  return items.map((row) => {
    const st = map.get(String(row.id));
    if (!st) return { ...row, stock_actual: 0 };
    return {
      ...row,
      stock_actual: Number(st.stock_actual ?? 0),
      stock_minimo: Number(st.stock_minimo ?? row.stock_minimo ?? 5),
    };
  });
}
