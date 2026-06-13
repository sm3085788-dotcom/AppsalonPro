/**
 * Operaciones destructivas para el Panel de control (solo uso interno / admin).
 * Opcional: `opts.dateFrom` + `opts.dateTo` (Date) limitan por campo de fecha del recurso.
 */
import { db, supabase } from '@appsalon/shared-config';
import { clearAllBasureroEntries, clearBasureroEntriesInDateRange } from './salonBasurero';
import { clearAllReportes, loadReportes, deleteReportesInDateRange } from './salonReportesStorage';

const CHUNK = 80;

/** @param {{ dateFrom?: Date, dateTo?: Date }} [opts] */
export function normalizeDateRangeOpts(opts) {
  if (!opts?.dateFrom || !opts?.dateTo) return null;
  const f = new Date(opts.dateFrom);
  const t = new Date(opts.dateTo);
  f.setHours(0, 0, 0, 0);
  t.setHours(23, 59, 59, 999);
  if (f > t) throw new Error('La fecha «desde» no puede ser posterior a «hasta».');
  return { fromISO: f.toISOString(), toISO: t.toISOString() };
}

function toYmd(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

async function wipeByGetAllDelete(getAll, deleteFn) {
  const res = await getAll();
  if (res.error) throw new Error(res.error.message || 'Error al leer datos.');
  const rows = res.data || [];
  for (const row of rows) {
    const r = await deleteFn(row.id);
    const err = r?.error;
    if (err) throw new Error(err.message || 'Error al borrar un registro.');
  }
  return rows.length;
}

async function wipeTable(table, notNullColumn = 'id') {
  const { error } = await supabase.from(table).delete().not(notNullColumn, 'is', null);
  if (error) throw new Error(error.message || `No se pudo vaciar ${table}.`);
}

async function deleteChunkedByIds(table, ids) {
  let total = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).delete().in('id', slice);
    if (error) throw new Error(error.message || `Error al borrar en ${table}.`);
    total += slice.length;
  }
  return total;
}

async function deleteWhereDateBetween(table, dateColumn, fromISO, toISO) {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .gte(dateColumn, fromISO)
    .lte(dateColumn, toISO);
  if (error) throw new Error(error.message);
  const ids = (data || []).map((row) => row.id).filter(Boolean);
  return deleteChunkedByIds(table, ids);
}

export async function purgeCitas(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) return wipeByGetAllDelete(() => db.citas.getAll(), (id) => db.citas.delete(id));
  return deleteWhereDateBetween('citas', 'fecha_hora', r.fromISO, r.toISO);
}

export async function purgeVentasYRelacionadas(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) {
    await wipeByGetAllDelete(() => db.devoluciones.getAll(), (id) => db.devoluciones.delete(id));
    await wipeByGetAllDelete(() => db.cambiosProductos.getAll(), (id) => db.cambiosProductos.delete(id));
    return wipeByGetAllDelete(() => db.ventas.getAll(), (id) => db.ventas.delete(id));
  }
  await deleteWhereDateBetween('devoluciones', 'fecha', r.fromISO, r.toISO);
  await deleteWhereDateBetween('cambios_productos', 'fecha', r.fromISO, r.toISO);
  return deleteWhereDateBetween('ventas', 'fecha', r.fromISO, r.toISO);
}

/** Solo facturas/ventas (Papelería), sin devoluciones ni cambios. */
export async function purgeVentasSolo(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) return wipeByGetAllDelete(() => db.ventas.getAll(), (id) => db.ventas.delete(id));
  return deleteWhereDateBetween('ventas', 'fecha', r.fromISO, r.toISO);
}

export async function purgeCajasYMovimientos(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) {
    await wipeByGetAllDelete(() => db.movimientosCaja.getAll(), (id) => db.movimientosCaja.delete(id));
    return wipeByGetAllDelete(() => db.cajas.getAll(), (id) => db.cajas.delete(id));
  }
  await deleteWhereDateBetween('movimientos_caja', 'fecha', r.fromISO, r.toISO);
  const y1 = toYmd(opts.dateFrom);
  const y2 = toYmd(opts.dateTo);
  const { data, error } = await supabase
    .from('cajas')
    .select('id')
    .gte('fecha_apertura', y1)
    .lte('fecha_apertura', y2);
  if (error) throw new Error(error.message);
  const ids = (data || []).map((row) => row.id).filter(Boolean);
  return deleteChunkedByIds('cajas', ids);
}

export async function purgePedidosEcommerce(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) {
    await wipeTable('ecommerce_order_items');
    await wipeTable('ecommerce_orders');
    return 0;
  }
  const { data: orders, error } = await supabase
    .from('ecommerce_orders')
    .select('id')
    .gte('created_at', r.fromISO)
    .lte('created_at', r.toISO);
  if (error) throw new Error(error.message);
  const orderIds = (orders || []).map((o) => o.id).filter(Boolean);
  let n = 0;
  for (let i = 0; i < orderIds.length; i += CHUNK) {
    const slice = orderIds.slice(i, i + CHUNK);
    const { error: e1 } = await supabase.from('ecommerce_order_items').delete().in('order_id', slice);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase.from('ecommerce_orders').delete().in('id', slice);
    if (e2) throw new Error(e2.message);
    n += slice.length;
  }
  return n;
}

async function purgeMarketingFull() {
  await wipeTable('marketing_comments');
  const { error: eLikes } = await supabase.from('marketing_post_likes').delete().not('post_id', 'is', null);
  if (eLikes) throw new Error(eLikes.message);
  await wipeTable('marketing_direct_messages');
  return wipeByGetAllDelete(() => db.marketingPosts.getAll(), (id) => db.marketingPosts.delete(id));
}

async function purgeMarketingInRange(r) {
  const { data: postsIn, error: eP } = await supabase
    .from('marketing_posts')
    .select('id')
    .gte('created_at', r.fromISO)
    .lte('created_at', r.toISO);
  if (eP) throw new Error(eP.message);
  const postIds = (postsIn || []).map((p) => p.id).filter(Boolean);

  for (let i = 0; i < postIds.length; i += CHUNK) {
    const slice = postIds.slice(i, i + CHUNK);
    const { error: ec } = await supabase.from('marketing_comments').delete().in('post_id', slice);
    if (ec) throw new Error(ec.message);
    const { error: el } = await supabase.from('marketing_post_likes').delete().in('post_id', slice);
    if (el) throw new Error(el.message);
  }

  const nComments = await deleteWhereDateBetween('marketing_comments', 'created_at', r.fromISO, r.toISO);
  const nMsg = await deleteWhereDateBetween('marketing_direct_messages', 'created_at', r.fromISO, r.toISO);
  const nPosts = await deleteWhereDateBetween('marketing_posts', 'created_at', r.fromISO, r.toISO);
  return nComments + nMsg + nPosts;
}

export async function purgeMarketingRed(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) return purgeMarketingFull();
  return purgeMarketingInRange(r);
}

export async function purgeClientes(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) return wipeByGetAllDelete(() => db.clientes.getAll(), (id) => db.clientes.delete(id));
  return deleteWhereDateBetween('clientes', 'created_at', r.fromISO, r.toISO);
}

export async function purgeEmpleados(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) return wipeByGetAllDelete(() => db.empleados.getAll(), (id) => db.empleados.delete(id));
  return deleteWhereDateBetween('empleados', 'created_at', r.fromISO, r.toISO);
}

export async function purgeInventario(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) return wipeByGetAllDelete(() => db.inventario.getAll(), (id) => db.inventario.delete(id));
  return deleteWhereDateBetween('inventario', 'updated_at', r.fromISO, r.toISO);
}

export async function purgeProveedores(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (r) {
    throw new Error(
      'Proveedores no tiene campo de fecha expuesto para filtrar: quitá el rango de fechas y volvé a intentar (borra todo el listado).',
    );
  }
  return wipeByGetAllDelete(() => db.proveedores.getAll(), (id) => db.proveedores.delete(id));
}

export async function purgeMetas(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) return wipeByGetAllDelete(() => db.metas.getAll(), (id) => db.metas.delete(id));
  return deleteWhereDateBetween('metas', 'creado_a', r.fromISO, r.toISO);
}

export async function purgeNotificaciones(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) return wipeByGetAllDelete(() => db.notificaciones.getAll(), (id) => db.notificaciones.delete(id));
  return deleteWhereDateBetween('notificaciones', 'created_at', r.fromISO, r.toISO);
}

export async function purgeIncidentes(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) return wipeByGetAllDelete(() => db.incidentes.getAll(), (id) => db.incidentes.delete(id));
  return deleteWhereDateBetween('incidentes', 'fecha', r.fromISO, r.toISO);
}

export async function purgeBasureroLocal(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) {
    await clearAllBasureroEntries();
    return 0;
  }
  return clearBasureroEntriesInDateRange(r.fromISO, r.toISO);
}

/** Reportes PDF generados guardados en este dispositivo (pantalla Reportes). */
export async function purgeReportesLocales(opts) {
  const r = normalizeDateRangeOpts(opts);
  if (!r) {
    const list = await loadReportes();
    const n = list.length;
    await clearAllReportes();
    return n;
  }
  return deleteReportesInDateRange(r.fromISO, r.toISO);
}

const PURGE_ALL_ORDER = [
  'ventas_chain',
  'caja_chain',
  'pedidos',
  'citas',
  'marketing',
  'notificaciones',
  'metas',
  'incidentes',
  'inventario',
  'proveedores',
  'clientes',
  'empleados',
  'basurero_local',
];

/** Ejecuta todos los purges de BD + locales opcionales. */
export async function purgeAllModules(opts = {}) {
  const { includeReportes = false, ...purgeOpts } = opts;
  const runners = {
    ventas_chain: purgeVentasYRelacionadas,
    caja_chain: purgeCajasYMovimientos,
    pedidos: purgePedidosEcommerce,
    citas: purgeCitas,
    marketing: purgeMarketingRed,
    notificaciones: purgeNotificaciones,
    metas: purgeMetas,
    incidentes: purgeIncidentes,
    inventario: purgeInventario,
    proveedores: purgeProveedores,
    clientes: purgeClientes,
    empleados: purgeEmpleados,
    basurero_local: purgeBasureroLocal,
  };

  let total = 0;
  for (const key of PURGE_ALL_ORDER) {
    const fn = runners[key];
    if (!fn) continue;
    const n = await fn(purgeOpts);
    if (typeof n === 'number') total += n;
  }
  if (includeReportes) {
    await purgeReportesLocales();
    total += 1;
  }
  return total;
}
