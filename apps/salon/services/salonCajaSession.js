import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@appsalon/shared-config';

const KEY = '@salon/caja_abierta_v1';

/** @typedef {{ cajaId: string, nombre: string, monto: number, abierto: string }} CajaSession */

export async function getCajaSession() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.cajaId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setCajaSession(session) {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function clearCajaSession() {
  await AsyncStorage.removeItem(KEY);
}

export function mapMovimientoToTx(m) {
  const tipo = m.tipo || 'ingreso';
  let kind = 'ingreso';
  if (tipo === 'apertura') kind = 'apertura';
  else if (tipo === 'egreso') kind = 'egreso';
  else if (tipo === 'cierre') kind = 'cierre';
  const signo = tipo === 'egreso' ? -1 : tipo === 'cierre' ? 0 : 1;
  return {
    id: `mov-${m.id}`,
    ts: new Date(m.fecha).getTime(),
    kind,
    titulo:
      tipo === 'apertura'
        ? 'Apertura de caja'
        : tipo === 'egreso'
          ? 'Egreso'
          : tipo === 'cierre'
            ? 'Cierre de caja'
            : 'Ingreso',
    detalle: m.descripcion || '—',
    monto: Number(m.monto) || 0,
    signo,
  };
}

export function ventaProductosNombres(v) {
  let items = v?.items;
  if (!items) return '—';
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      return '—';
    }
  }
  if (!Array.isArray(items) || items.length === 0) return '—';
  const nombres = items
    .map((it) => String(it?.nombre || it?.producto || it?.descripcion || '').trim())
    .filter(Boolean);
  return nombres.length ? nombres.join(', ') : '—';
}

export function mapVentaToTx(v) {
  const mp = v.metodo_pago || 'efectivo';
  const signo = mp === 'efectivo' ? 1 : 0;
  const cliente = v.cliente_nombre || v.cliente?.nombre;
  const detalle = [cliente, mp].filter(Boolean).join(' · ') || '—';
  const productos = ventaProductosNombres(v);
  return {
    id: `ven-${v.id}`,
    ts: new Date(v.fecha || v.creado_a).getTime(),
    kind: 'venta_producto',
    titulo: v.no_factura || 'Venta POS',
    productos,
    detalle,
    monto: Number(v.total ?? v.monto ?? 0),
    signo,
  };
}

export async function loadCajaTxs(cajaId) {
  const [movRes, venRes] = await Promise.all([
    db.cajas.getMovimientos(cajaId),
    db.cajas.getVentas(cajaId),
  ]);
  const txs = [
    ...(movRes.data || []).map(mapMovimientoToTx),
    ...(venRes.data || []).map(mapVentaToTx),
  ];
  txs.sort((a, b) => b.ts - a.ts);
  return txs;
}
