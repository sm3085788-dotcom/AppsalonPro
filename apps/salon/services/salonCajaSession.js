import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, getSalonSessionProfile, getSalonSucursalScope } from '@appsalon/shared-config';

const KEY_PREFIX = '@salon/caja_abierta_v1';
const KEY_CHICA_PREFIX = '@salon/caja_chica_saldo_v1';
const LEGACY_CHICA_KEY = '@salon/caja_chica_saldo_v1';
const LEGACY_SESSION_KEY = '@salon/caja_abierta_v1';

let matrizScopeCache = null;
let matrizScopeUserId = null;

export function invalidateSalonCajaStorageScope() {
  matrizScopeCache = null;
  matrizScopeUserId = null;
}

function chicaKey(scopeId) {
  return `${KEY_CHICA_PREFIX}/${scopeId}`;
}

function sessionKey(scopeId) {
  return `${KEY_PREFIX}/${scopeId}`;
}

/** Sucursal activa para caja / caja chica (perfil admin_sucursal o matriz para admin global). */
export async function resolveCajaSucursalId() {
  const profile = getSalonSessionProfile();
  const userId = profile?.id ? String(profile.id) : null;
  const { sucursalId, isGlobal } = getSalonSucursalScope();
  if (sucursalId) return String(sucursalId);
  if (!isGlobal) return null;
  if (matrizScopeCache && matrizScopeUserId === userId) return matrizScopeCache;
  try {
    const { data } = await db.sucursales.listActivas();
    const matriz = (data || []).find((s) => s.es_matriz) || (data || [])[0];
    if (matriz?.id) {
      matrizScopeCache = String(matriz.id);
      matrizScopeUserId = userId;
      return matrizScopeCache;
    }
  } catch {
    // noop
  }
  return null;
}

async function readLocalChica(scopeId) {
  if (!scopeId) return 0;
  const key = chicaKey(scopeId);
  let raw = await AsyncStorage.getItem(key);
  if (raw == null || raw === '') {
    raw = await AsyncStorage.getItem(LEGACY_CHICA_KEY);
    if (raw != null && raw !== '') {
      await AsyncStorage.setItem(key, raw);
      await AsyncStorage.removeItem(LEGACY_CHICA_KEY);
    }
  }
  if (raw == null || raw === '') return 0;
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

async function writeLocalChica(scopeId, amount) {
  if (!scopeId) return;
  await AsyncStorage.setItem(chicaKey(scopeId), String(amount));
}

/** Saldo de caja chica de la sucursal actual (independiente por local; nueva sucursal = Q 0). */
export async function getCajaChicaSaldo() {
  const scopeId = await resolveCajaSucursalId();
  if (scopeId) {
    const { data, error } = await db.cajaChica.getSaldo(scopeId);
    if (!error && data != null) {
      const n = Number(data);
      if (Number.isFinite(n)) {
        const safe = Math.max(0, Math.round(n * 100) / 100);
        await writeLocalChica(scopeId, safe);
        return safe;
      }
    }
  }
  return readLocalChica(scopeId);
}

export async function setCajaChicaSaldo(amount) {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : 0;
  const scopeId = await resolveCajaSucursalId();
  if (scopeId) {
    const { error } = await db.cajaChica.setSaldo(scopeId, safe);
    if (!error) {
      await writeLocalChica(scopeId, safe);
      return safe;
    }
  }
  if (scopeId) await writeLocalChica(scopeId, safe);
  return safe;
}

/** @typedef {{ cajaId: string, nombre: string, monto: number, abierto: string }} CajaSession */

export async function getCajaSession() {
  try {
    const scopeId = await resolveCajaSucursalId();
    const key = scopeId ? sessionKey(scopeId) : LEGACY_SESSION_KEY;
    let raw = await AsyncStorage.getItem(key);
    if (!raw && scopeId) {
      raw = await AsyncStorage.getItem(LEGACY_SESSION_KEY);
      if (raw) {
        await AsyncStorage.setItem(key, raw);
        await AsyncStorage.removeItem(LEGACY_SESSION_KEY);
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.cajaId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setCajaSession(session) {
  const scopeId = await resolveCajaSucursalId();
  const key = scopeId ? sessionKey(scopeId) : LEGACY_SESSION_KEY;
  await AsyncStorage.setItem(key, JSON.stringify(session));
}

export async function clearCajaSession() {
  const scopeId = await resolveCajaSucursalId();
  if (scopeId) {
    await AsyncStorage.removeItem(sessionKey(scopeId));
    return;
  }
  await AsyncStorage.removeItem(LEGACY_SESSION_KEY);
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
