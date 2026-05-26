import { db } from './supabaseClient.js';

const CAJA_CERRADA_MSG =
  'Abrí la caja en el módulo Cajas antes de registrar ventas o confirmar cobros en efectivo.';

/** Devuelve la caja abierta o un error listo para mostrar al usuario. */
export async function requireCajaAbierta() {
  const { data: caja, error } = await db.cajas.getCajaActual();
  if (error) return { caja: null, error };
  if (!caja?.id || String(caja.estado) !== 'abierta') {
    return { caja: null, error: { message: CAJA_CERRADA_MSG } };
  }
  return { caja, error: null };
}
