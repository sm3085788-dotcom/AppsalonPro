/**
 * Supabase Client - Configuración Compartida
 * 
 * Este archivo conecta todas las apps (Salon, Clientes, Web) con tu base de datos existente.
 * NO crea tablas nuevas, solo se conecta a tu esquema actual.
 * 
 * Uso en cualquier app:
 * import { supabase } from '@shared/config/supabaseClient';
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { isSalonAdminRole } from './salonRoles.js';
import { getSalonSucursalScope } from './salonSession.js';
import { localCalendarDateString } from './localDate.js';
import { getClientSucursalId, mergeInventarioWithSucursalStock, ensureClientSucursalId } from './clientSucursal.js';

function applySalonSucursalFilter(q, column = 'sucursal_id') {
  const scope = getSalonSucursalScope();
  if (scope.isGlobal || !scope.sucursalId) return q;
  return q.eq(column, scope.sucursalId);
}

async function resolveStockSucursalId(explicitId = null) {
  if (explicitId) return explicitId;
  const scope = getSalonSucursalScope();
  if (!scope.isGlobal && scope.sucursalId) return scope.sucursalId;
  return await getClientSucursalId();
}

export { mergeInventarioWithSucursalStock };
export { localCalendarDateString } from './localDate.js';
import {
  inventarioRowToAgendaServicio,
  inventarioRowToAgendaItem,
  splitNotas,
  sanitizeInventarioFechaVencimiento,
  parseDuracionMinutosFromMeta,
  getArticuloTipo,
} from './inventarioMeta.js';
import {
  parseSalonFisicoUnidades,
  mergeAndreasPremiosSalonFisico,
  ANDREAS_META,
} from './andreasPremios.js';
import {
  buildPremiosCountsFromReglas,
  syncReglaOnPedidoDelivered,
  syncReglaOnCanjeRedeemed,
  syncReglasProductosFromPedidos,
  syncReglaCitas,
  syncReglaCitasOnCanjeRedeemed,
  getReglasState,
  findCanjePendienteForCheckout,
  applyDiscountToSubtotal,
  parseCanjeFromCheckoutSnapshot,
  countProductoQtyInOrder,
  ruleIdForOrder,
  PREMIO_REGLA,
  resolvePremioDiscountPct,
  markSalonFisicoCanjePendiente,
  andreasMetaAppForMembresia,
  resolveCheckoutCanjeParaCliente,
} from './andreasPremiosCycles.js';
import {
  tallyAndreasProductoPuntos,
  countCitasPremios,
  parseReferidoInvitadoState,
  REFERIDO_PREMIOS_COPY,
} from './referidoPremios.js';
import {
  buildDefaultCodigoReferido,
  normalizeReferralCode,
  resolveReferralCodeForAuth,
  consumePendingReferralCode,
} from './referralInvite.js';

export { buildDefaultCodigoReferido } from './referralInvite.js';
import {
  parseReferidosPremiosState,
  resolveReferidosCanjePendiente,
  syncReferidosOnCanjeRedeemed,
} from './andreasReferidos.js';
import {
  andreasMetaCitasForMembresia,
  parseCanjeFromNotasServicio,
} from './andreasPremiosCitasAgenda.js';
import {
  andreasMetaSalonForMembresia,
  resolveSalonCanjeParaCliente,
  ensureSalonFisicoCanjeEnAp,
} from './andreasPremiosSalonVenta.js';
import { resolveCitasCanjeParaCliente } from './andreasPremiosSalonServicio.js';
import { syncSalonFisicoOnCanjeRedeemed, mergeVentaNotasConCanjeSalon } from './andreasPremiosCycles.js';
import { mergeNotasServicioConCanje } from './andreasPremiosCitasAgenda.js';

/** Errores de Supabase por objeto SQL ausente o permisos de lectura (no deben tumbar toda la pantalla Premios). */
function isPremiosSoftDbError(error) {
  const msg = String(error?.message || error?.hint || '');
  return (
    /function|does not exist|schema cache|relation .* does not exist|column .* does not exist/i.test(msg) ||
    /permission denied for (table|relation)/i.test(msg) ||
    error?.code === '42501'
  );
}

async function hydrateAndreasPremiosForCanje(clienteRow) {
  if (!clienteRow?.id) {
    return {
      cliente: clienteRow,
      apWorking: null,
      citasVerificadas: 0,
      referidosTotalValidados: null,
    };
  }

  const { data: fresh } = await supabase
    .from('clientes')
    .select('id, user_id, andreas_premios, membresia_nivel')
    .eq('id', clienteRow.id)
    .maybeSingle();

  const merged = {
    ...clienteRow,
    ...(fresh || {}),
    id: clienteRow.id,
  };
  const membresia = merged.membresia_nivel;
  let ap = merged.andreas_premios;
  let apWorking = ap && typeof ap === 'object' ? { ...ap } : {};

  const citasVerificadas = await countCitasVerificadasCliente(merged.id);
  const citasMeta = andreasMetaCitasForMembresia(membresia);
  apWorking = syncReglaCitas(apWorking, citasVerificadas, citasMeta, membresia);

  if (merged.user_id) {
    const { data: orders } = await supabase
      .from('ecommerce_orders')
      .select('id, status, payment_method, fulfillment_type, checkout_snapshot')
      .eq('client_user_id', merged.user_id)
      .in('status', ['pending', 'confirmed', 'prepared', 'ready', 'delivered']);
    const allOrders = Array.isArray(orders) ? orders : [];
    const orderIds = allOrders.map((o) => o.id).filter(Boolean);
    let orderLines = [];
    if (orderIds.length) {
      const { data: lines } = await supabase
        .from('ecommerce_order_items')
        .select('qty, order_id, product:inventario(notas)')
        .in('order_id', orderIds);
      if (Array.isArray(lines)) orderLines = lines;
    }
    const membresiaMeta = andreasMetaAppForMembresia(membresia);
    apWorking = syncReglasProductosFromPedidos(
      apWorking,
      allOrders,
      orderLines,
      membresiaMeta,
      membresia,
    );
  }

  const apPersistNeeded =
    JSON.stringify(apWorking.reglas) !== JSON.stringify(ap?.reglas) ||
    JSON.stringify(apWorking.salon_fisico_canje_pendiente) !==
      JSON.stringify(ap?.salon_fisico_canje_pendiente);
  if (apPersistNeeded) {
    await supabase
      .from('clientes')
      .update({ andreas_premios: apWorking })
      .eq('id', merged.id);
  }

  let referidosTotalValidados = null;
  if (merged.user_id) {
    const { data: refResumen } = await supabase.rpc('premios_andreas_referidos_resumen', {
      p_referidor: merged.user_id,
    });
    if (refResumen && typeof refResumen === 'object' && refResumen.total_validados != null) {
      referidosTotalValidados = Math.max(0, Math.floor(Number(refResumen.total_validados) || 0));
    }
  }

  return {
    cliente: { ...merged, andreas_premios: apWorking },
    apWorking,
    citasVerificadas,
    referidosTotalValidados,
  };
}

async function countCitasVerificadasCliente(clienteId) {
  if (!clienteId) return 0;
  const { data: citas, error } = await supabase
    .from('citas')
    .select('estado, visita_qr_token, visita_validada_en, fecha_hora')
    .eq('cliente_id', clienteId);
  if (error || !Array.isArray(citas)) return 0;
  return countCitasPremios(citas).verificadas;
}

/** Venta o cita que ya consumió canje citas pero el JSON no se reinició (reparación). */
async function findCitasCanjeConsumidoId(clienteId) {
  if (!clienteId) return null;
  const { data: ventas } = await supabase
    .from('ventas')
    .select('id, notas')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: false })
    .limit(40);
  for (const v of ventas || []) {
    const c = parseCanjeFromNotasServicio(v.notas);
    if (c && (!c.rule_id || c.rule_id === PREMIO_REGLA.CITAS)) return v.id;
  }
  const { data: citas } = await supabase
    .from('citas')
    .select('id, notas_servicio')
    .eq('cliente_id', clienteId)
    .order('fecha_hora', { ascending: false })
    .limit(40);
  for (const cita of citas || []) {
    const c = parseCanjeFromNotasServicio(cita.notas_servicio);
    if (c && (!c.rule_id || c.rule_id === PREMIO_REGLA.CITAS)) return cita.id;
  }
  return null;
}

import { enrichTendenciasFeedPosts, isTendenciasFeedPost } from './tendenciasPublication.js';

export { isSalonAdminRole, normalizeProfileRole } from './salonRoles.js';

/** PostgREST: `.single()` con 0 o varias filas (p. ej. sin caja abierta o RLS). */
export function isPostgrestSingleRowError(error) {
  if (!error) return false;
  const msg = String(error.message || '');
  return (
    error.code === 'PGRST116' ||
    /Cannot coerce the result to a single JSON object/i.test(msg) ||
    /JSON object requested, multiple \(or no\) rows returned/i.test(msg)
  );
}

/** Sesión persistida inválida (p. ej. refresh revocado en servidor) — conviene `signOut({ scope: 'local' })`. */
export function isInvalidRefreshTokenError(error) {
  if (!error) return false;
  const msg = String(error.message || error || '');
  const code = String(error.code || '');
  return (
    code === 'refresh_token_not_found' ||
    /invalid refresh token/i.test(msg) ||
    /refresh token not found/i.test(msg)
  );
}
export {
  TIENDA_JSON_MARK,
  DEFAULT_TIENDA_META,
  VOLUMEN_TRABAJO_OPCIONES,
  volumenTrabajoLabel,
  emptyPreciosPorVolumen,
  normalizePreciosPorVolumen,
  servicioUsaPreciosPorVolumen,
  getPreciosPorVolumenFromRow,
  precioServicioPorVolumen,
  precioVentaReferencia,
  resolvePrecioRegularTienda,
  inventarioSearchSubtitle,
  parseDuracionMinutosFromMeta,
  splitNotas,
  getArticuloTipo,
  mergeNotas,
  sanitizeInventarioFechaVencimiento,
  inventarioRowToAgendaServicio,
  inventarioRowToAgendaItem,
  INVENTARIO_PROMO_DIAS_DEFAULT,
  isPromocionVigente,
  maybeRevertInventarioPromoExpired,
  computePromocionHastaISO,
  toInventarioISODate,
  formatPromocionHastaLabel,
} from './inventarioMeta.js';

// Variables de entorno - Configura en cada app
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validación de credenciales
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase credentials not configured. Please add them to your .env file.');
}

// Configuración de storage para React Native
const supabaseStorageAdapter = {
  getItem: async (key) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.setItem(key, value);
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.removeItem(key);
    }
    return AsyncStorage.removeItem(key);
  },
};

// Cliente Supabase configurado
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: supabaseStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// GoTrue hace console.error antes de borrar sesión local; en RN eso abre LogBox aunque el flujo sea esperable.
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  try {
    const { LogBox } = require('react-native');
    LogBox?.ignoreLogs?.([
      'Invalid Refresh Token',
      'Refresh Token Not Found',
      'AuthApiError: Invalid Refresh Token',
    ]);
  } catch {
    /* web / tests: sin react-native */
  }
}

/**
 * Helper Functions para interactuar con tu base de datos
 * Funciones mapeadas a tu esquema existente
 */

function mapClienteEnsureError(error) {
  const msg = String(error?.message || '');
  if (/duplicate key|unique constraint|23505/i.test(msg)) {
    if (/user_id|clientes_user_id/i.test(msg)) {
      return {
        message: 'Esta cuenta ya tiene ficha de cliente. Usá «Iniciar sesión» en lugar de crear otra cuenta.',
      };
    }
    if (/email/i.test(msg)) {
      return {
        message:
          'Ese correo ya está vinculado a otra ficha. Iniciá sesión con ese correo o usá otro correo para registrarte.',
      };
    }
    if (/nombre/i.test(msg)) {
      return {
        message:
          'El salón tenía un límite de nombre único en la base de datos. Ejecutá supabase-clientes-nombre-unique-fix.sql en Supabase y volvé a intentar.',
      };
    }
    return {
      message:
        'No se pudo crear la ficha (conflicto en base de datos). Ejecutá supabase-clientes-nombre-unique-fix.sql en Supabase e intentá de nuevo.',
    };
  }
  return error;
}

async function ensureClienteRowViaRpc({ userId, nombre, email }) {
  const { data: rpcId, error: rpcErr } = await supabase.rpc('ensure_cliente_for_auth_user', {
    p_user_id: userId,
    p_nombre: nombre,
    p_email: email || null,
    p_telefono: null,
  });
  if (rpcErr) {
    if (/does not exist|could not find the function/i.test(String(rpcErr.message || ''))) {
      return { data: null, error: null };
    }
    return { data: null, error: mapClienteEnsureError(rpcErr) };
  }
  if (!rpcId) return { data: null, error: null };
  const { data, error } = await supabase.from('clientes').select('*').eq('id', rpcId).maybeSingle();
  return { data, error: error ? mapClienteEnsureError(error) : null };
}

async function aplicarCodigoReferidoRegistro(userId, referralCode) {
  const codigo = normalizeReferralCode(referralCode);
  if (!userId || !codigo) return { data: null, error: null };
  const { data, error } = await supabase.rpc('cliente_aplicar_codigo_referido', {
    p_user_id: userId,
    p_codigo: codigo,
  });
  if (error) {
    if (/does not exist|could not find the function/i.test(String(error.message || ''))) {
      return { data: null, error: null };
    }
    return { data: null, error: mapClienteEnsureError(error) };
  }
  if (data?.ok === false && data?.error && !/no encontrado/i.test(String(data.error))) {
    return { data: null, error: { message: String(data.error) } };
  }
  const { data: row } = await supabase.from('clientes').select('*').eq('user_id', userId).maybeSingle();
  return { data: row, error: null };
}

async function patchClienteFromAuthExtras(row, { userId, referralCode, referidor, notas }) {
  if (!row?.id) return row;
  const patch = {};
  if (referidor && !row.referido_por) patch.referido_por = referidor;
  if (notas && !String(row.notas || '').includes('Código referido:')) patch.notas = notas;
  if (!String(row.codigo_referido || '').trim()) patch.codigo_referido = buildDefaultCodigoReferido(userId);
  if (referidor && referralCode && !row.referido_codigo_pendiente) {
    patch.referido_codigo_pendiente = String(referralCode).trim().toUpperCase();
  }
  if (!Object.keys(patch).length) return row;
  const { data, error } = await supabase
    .from('clientes')
    .update(patch)
    .eq('id', row.id)
    .select()
    .single();
  if (error && /codigo_referido|referido_|column/i.test(String(error.message || ''))) {
    const minimal = { ...patch };
    delete minimal.codigo_referido;
    delete minimal.referido_codigo_pendiente;
    delete minimal.referido_por;
    if (Object.keys(minimal).length) {
      const retry = await supabase.from('clientes').update(minimal).eq('id', row.id).select().single();
      return retry.data || row;
    }
    return row;
  }
  return data || row;
}

/**
 * UUID de auth del referidor: código UUID directo o `codigo_referido` vía RPC.
 */
async function resolveReferidorUserIdForSignup(referralCode, newUserId) {
  const raw = normalizeReferralCode(referralCode);
  if (!raw) return null;
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidLike.test(raw)) {
    const id = raw.toLowerCase();
    if (id === String(newUserId || '').toLowerCase()) return null;
    return id;
  }
  const { data, error } = await supabase.rpc('resolve_codigo_referido_andreas', { p_codigo: raw });
  if (!error && data != null) {
    if (String(data).toLowerCase() === String(newUserId || '').toLowerCase()) return null;
    return String(data);
  }
  const { data: byStored } = await supabase
    .from('clientes')
    .select('user_id')
    .not('user_id', 'is', null)
    .ilike('codigo_referido', raw)
    .limit(1)
    .maybeSingle();
  if (byStored?.user_id) {
    if (String(byStored.user_id).toLowerCase() === String(newUserId || '').toLowerCase()) return null;
    return String(byStored.user_id);
  }
  return null;
}

async function ensureOwnReferralCode(userId, row) {
  if (!row?.id || !userId) return row;
  if (String(row.codigo_referido || '').trim()) return row;
  const { data: rpcCode, error: rpcErr } = await supabase.rpc('ensure_cliente_codigo_referido', {
    p_user_id: userId,
  });
  if (!rpcErr && rpcCode) {
    const { data: upd } = await supabase.from('clientes').select('*').eq('id', row.id).maybeSingle();
    if (upd) return upd;
  }
  const code = buildDefaultCodigoReferido(userId);
  const { data: upd, error: upErr } = await supabase
    .from('clientes')
    .update({ codigo_referido: code })
    .eq('id', row.id)
    .select()
    .single();
  if (!upErr && upd) return upd;
  return row;
}

async function patchNombreIfFuller(row, nom) {
  if (!row?.id) return row;
  const incoming = String(nom || '').trim();
  if (!incoming) return row;
  const existing = String(row.nombre || '').trim();
  const inParts = incoming.split(/\s+/).filter(Boolean).length;
  const exParts = existing.split(/\s+/).filter(Boolean).length;
  if (existing && inParts <= exParts) return row;
  const { data, error } = await supabase
    .from('clientes')
    .update({ nombre: incoming })
    .eq('id', row.id)
    .select()
    .single();
  if (!error && data) return data;
  return row;
}

async function tryApplyPendingReferral(userId, row, referralCode) {
  if (!userId || !referralCode || !row?.id) return row;
  if (row.referido_por || row.referido_beneficio_registrado) return row;
  const linked = await aplicarCodigoReferidoRegistro(userId, referralCode);
  if (linked.data) return linked.data;
  const referidor = await resolveReferidorUserIdForSignup(referralCode, userId);
  if (referidor) {
    const patched = await patchClienteFromAuthExtras(row, {
      userId,
      referralCode,
      referidor,
      notas: `Código referido: ${referralCode}`,
    });
    void supabase.rpc('referido_registrar_invitacion', { p_cliente_id: patched.id || row.id });
    return patched;
  }
  return row;
}

export const db = {
  // ==================== AUTENTICACIÓN ====================
  auth: {
    /** Email o teléfono (E.164, ej. +50257123456) + contraseña; según auth.users. */
    signInWithPassword: async ({ email, phone, password }) => {
      if (phone) {
        return await supabase.auth.signInWithPassword({ phone, password });
      }
      return await supabase.auth.signInWithPassword({ email, password });
    },
    signIn: async (email, password) => {
      return await supabase.auth.signInWithPassword({ email, password });
    },
    signUp: async (email, password, metadata) => {
      return await supabase.auth.signUp({ 
        email, 
        password, 
        options: { data: metadata } 
      });
    },
    signUpWithPhone: async ({ phone, password, metadata }) => {
      return await supabase.auth.signUp({
        phone,
        password,
        options: { data: metadata || {} },
      });
    },
    /** SMS OTP. No fuerces shouldCreateUser: false por defecto (rompe el flujo igual que en GoTrue: default true). */
    signInWithOtp: async (phone, otpOptions = {}) => {
      return await supabase.auth.signInWithOtp({ phone, options: otpOptions });
    },
    /** Completa login con código de 6 dígitos (incluye OTP fijo de números de prueba). */
    verifyPhoneOtp: async (phone, token) => {
      return await supabase.auth.verifyOtp({
        phone,
        token: String(token).trim(),
        type: 'sms',
      });
    },
    signOut: async () => {
      return await supabase.auth.signOut();
    },
    getUser: async () => {
      return await supabase.auth.getUser();
    },
    getSession: async () => {
      return await supabase.auth.getSession();
    },
  },

  // ==================== CLIENTES ====================
  clientes: {
    // Obtener todos los clientes
    getAll: async () => {
      return await supabase.from('clientes').select('*').order('created_at', { ascending: false });
    },

    // Obtener un cliente por ID
    getById: async (id) => {
      return await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
    },

    // Buscar clientes por nombre o teléfono
    search: async (query) => {
      return await supabase
        .from('clientes')
        .select('*')
        .or(
          `nombre.ilike.%${query}%,telefono.ilike.%${query}%,email.ilike.%${query}%,notas.ilike.%${query}%,direccion.ilike.%${query}%,categoria.ilike.%${query}%`,
        )
        .order('nombre');
    },

    // Crear nuevo cliente
    create: async (data) => {
      const scope = getSalonSucursalScope();
      const sucursalId =
        data.creado_en_sucursal_id ||
        (!scope.isGlobal ? scope.sucursalId : null) ||
        null;
      if (!scope.isGlobal && !sucursalId) {
        return {
          data: null,
          error: {
            message:
              'Tu perfil admin_sucursal debe tener sucursal_id en profiles. Cerrá sesión y volvé a entrar.',
          },
        };
      }
      return await supabase
        .from('clientes')
        .insert({
          nombre: data.nombre,
          telefono: data.telefono || null,
          email: data.email || null,
          notas: data.notas || null,
          tipo_registro: data.tipo_registro || 'manual',
          categoria: data.categoria || 'Nuevo',
          cumpleanos: data.cumpleanos || null,
          direccion: data.direccion || null,
          contacto_emergencia: data.contacto_emergencia || null,
          tel_emergencia: data.tel_emergencia || null,
          referido_por: data.referido_por || null,
          photo_url: data.photo_url || null,
          user_id: data.user_id || null,
          creado_en_sucursal_id: sucursalId,
        })
        .select()
        .single();
    },

    getByUserId: async (userId) => {
      return await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    },

    /**
     * Tras registro/login en app clientes: crea o actualiza la ficha enlazada a auth.users.
     * Requiere política RLS INSERT con user_id = auth.uid() para cuentas nuevas.
     */
    ensureFromAuth: async ({ userId, nombre, email, referralCode }) => {
      if (!userId) return { data: null, error: { message: 'Sin usuario autenticado' } };

      const { data: existing, error: findErr } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (findErr) return { data: null, error: findErr };

      if (existing) {
        const patch = {};
        const nom = String(nombre || '').trim();
        const em = String(email || '').trim();
        if (em && !String(existing.email || '').trim()) patch.email = em;
        let nextRow = existing;
        if (Object.keys(patch).length > 0) {
          const { data, error } = await supabase
            .from('clientes')
            .update(patch)
            .eq('id', existing.id)
            .select()
            .single();
          if (error) return { data: null, error, created: false };
          nextRow = data || existing;
        }
        nextRow = await patchNombreIfFuller(nextRow, nom);
        let withCode = await ensureOwnReferralCode(userId, nextRow);
        if (referralCode) {
          withCode = await tryApplyPendingReferral(userId, withCode, referralCode);
        }
        return { data: withCode, error: null, created: false };
      }

      const nom = String(nombre || '').trim() || String(email || '').split('@')[0] || 'Cliente';
      const notas = referralCode ? `Código referido: ${String(referralCode).trim()}` : null;
      const referidor = await resolveReferidorUserIdForSignup(referralCode, userId);

      let row = null;
      let created = false;

      const viaRpc = await ensureClienteRowViaRpc({ userId, nombre: nom, email });
      if (viaRpc.error) return { data: null, error: viaRpc.error, created: false };
      if (viaRpc.data) {
        row = viaRpc.data;
        created = true;
      }

      if (!row) {
        const { data, error } = await supabase
          .from('clientes')
          .insert({
            user_id: userId,
            nombre: nom,
            email: email || null,
            tipo_registro: 'app_clientes',
            categoria: 'Nuevo',
            notas,
          })
          .select()
          .single();
        if (error) {
          const retry = await ensureClienteRowViaRpc({ userId, nombre: nom, email });
          if (retry.data) {
            row = retry.data;
            created = true;
          } else {
            return { data: null, error: mapClienteEnsureError(error), created: false };
          }
        } else {
          row = data;
          created = true;
        }
      }

      row = await patchClienteFromAuthExtras(row, { userId, referralCode, referidor, notas });
      row = await patchNombreIfFuller(row, nom);
      row = await ensureOwnReferralCode(userId, row);

      if (referralCode) {
        row = await tryApplyPendingReferral(userId, row, referralCode);
      } else if (row?.id && referidor) {
        void supabase.rpc('referido_registrar_invitacion', { p_cliente_id: row.id });
      }

      if (row?.id && (row.referido_por || referidor)) {
        void import('./clientNotifications.js').then(({ enqueueClientNotification }) =>
          enqueueClientNotification({
            clientUserId: userId,
            clienteId: row.id,
            tipo: 'premios',
            titulo: 'Bienvenida ANDREAS',
            mensaje: REFERIDO_PREMIOS_COPY.bienvenida,
            targetScreen: 'premios',
          }),
        );
      }
      return { data: row, error: null, created };
    },

    updateByUserId: async (userId, data) => {
      return await supabase
        .from('clientes')
        .update(data)
        .eq('user_id', userId)
        .select()
        .single();
    },

    /** true si el correo sigue ligado a una cuenta Auth activa (bloquear segundo registro). */
    isEmailAccountActive: async (email) => {
      const em = String(email || '').trim();
      if (!em) return { data: false, error: null };
      const { data, error } = await supabase.rpc('cliente_correo_cuenta_activa', { p_email: em });
      if (error) {
        if (/function|does not exist|42883/i.test(String(error.message || ''))) {
          return { data: null, error: null, rpcMissing: true };
        }
        return { data: null, error };
      }
      return { data: Boolean(data), error: null, rpcMissing: false };
    },

    /** Elimina la cuenta Auth del cliente y desvincula/anonymiza su ficha (RPC SECURITY DEFINER). */
    deleteOwnAccount: async () => {
      const { data, error } = await supabase.rpc('cliente_eliminar_cuenta_propia');
      if (error) {
        if (/function|does not exist|42883/i.test(String(error.message || ''))) {
          return {
            data: null,
            error: {
              message:
                'Falta ejecutar supabase-cliente-eliminar-cuenta.sql en Supabase para habilitar eliminar cuenta.',
            },
          };
        }
        return { data: null, error };
      }
      if (data && typeof data === 'object' && data.ok === false) {
        return {
          data: null,
          error: { message: String(data.error || 'No se pudo eliminar la cuenta') },
        };
      }
      await supabase.auth.signOut({ scope: 'local' });
      return { data, error: null };
    },

    // Actualizar cliente
    update: async (id, data) => {
      return await supabase
        .from('clientes')
        .update(data)
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar cliente
    delete: async (id) => {
      return await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
    },

    // Actualizar puntos de fidelidad
    updatePuntos: async (id, puntos) => {
      return await supabase
        .from('clientes')
        .update({ puntos_fidelidad: puntos })
        .eq('id', id)
        .select()
        .single();
    },

    // Obtener clientes por categoría
    getByCategoria: async (categoria) => {
      return await supabase
        .from('clientes')
        .select('*')
        .eq('categoria', categoria)
        .order('nombre');
    },

    // Obtener clientes referidos por un usuario
    getReferidos: async (userId) => {
      return await supabase
        .from('clientes')
        .select('*')
        .eq('referido_por', userId);
    },
  },

  /**
   * Programa ANDREAS (Premios): contadores desde pedidos/citas + JSON en ficha (salón físico).
   * Requiere ejecutar `supabase-andreas-premios.sql` en Supabase para columnas y RPC.
   */
  premiosAndreas: {
    getResumen: async ({ clientUserId, clienteRow }) => {
      const meta = {
        appEfectivoRetiro: ANDREAS_META.appEfectivoRetiro,
        appTarjetaDelivery: ANDREAS_META.appTarjetaDelivery,
        citas: ANDREAS_META.citas,
        salon: ANDREAS_META.salon,
        referidos: ANDREAS_META.referidos,
      };
      const empty = {
        productosAppEfectivoRetiro: 0,
        productosAppTarjetaDelivery: 0,
        productosAppEfectivoRetiroPendiente: 0,
        productosAppTarjetaDeliveryPendiente: 0,
        citasVerificadas: 0,
        citasPendientes: 0,
        productosSalonFisico: 0,
        referidosPrimeraCompra: 0,
        esReferidoInvitado: false,
        referidoInvitado: false,
        codigoReferido: null,
        meta,
        error: null,
        rpcMissing: false,
      };
      if (!clientUserId || !clienteRow?.id) {
        return { ...empty, error: { message: 'Sin ficha de cliente' } };
      }

      const { data: freshCliente, error: eFresh } = await supabase
        .from('clientes')
        .select('codigo_referido, andreas_premios, referido_por')
        .eq('id', clienteRow.id)
        .maybeSingle();

      const freshOk = !eFresh || isPremiosSoftDbError(eFresh);
      if (eFresh && !freshOk) {
        return { ...empty, error: eFresh };
      }

      const esReferidoInvitado = Boolean(
        (freshOk ? freshCliente?.referido_por : null) ?? clienteRow.referido_por,
      );
      if (esReferidoInvitado) {
        void supabase.rpc('referido_registrar_invitacion', { p_cliente_id: clienteRow.id });
      }
      const codigoReferido = String(
        (freshOk ? freshCliente?.codigo_referido : null) || clienteRow.codigo_referido || '',
      ).trim() || null;
      let codigoReferidoFinal = codigoReferido;
      if (!codigoReferidoFinal && clientUserId) {
        const { data: rpcCode, error: rpcErr } = await supabase.rpc('ensure_cliente_codigo_referido', {
          p_user_id: clientUserId,
        });
        if (!rpcErr && rpcCode) {
          codigoReferidoFinal = String(rpcCode).trim();
        } else {
          const code = buildDefaultCodigoReferido(clientUserId);
          const { data: codUp, error: codErr } = await supabase
            .from('clientes')
            .update({ codigo_referido: code })
            .eq('id', clienteRow.id)
            .select('codigo_referido')
            .maybeSingle();
          if (!codErr && codUp?.codigo_referido) {
            codigoReferidoFinal = String(codUp.codigo_referido).trim();
          }
        }
      }
      let productosSalonFisico = 0;
      const ap = (freshOk ? freshCliente?.andreas_premios : null) ?? clienteRow.andreas_premios;
      if (ap && typeof ap === 'object' && ap.salon_fisico_unidades != null) {
        const n = Number(ap.salon_fisico_unidades);
        if (Number.isFinite(n)) productosSalonFisico = Math.max(0, Math.floor(n));
      }

      const { data: orders, error: eOrd } = await supabase
        .from('ecommerce_orders')
        .select('id, status, payment_method, fulfillment_type, checkout_snapshot')
        .eq('client_user_id', clientUserId)
        .in('status', ['pending', 'confirmed', 'prepared', 'ready', 'delivered']);
      if (eOrd && !isPremiosSoftDbError(eOrd)) {
        return {
          ...empty,
          codigoReferido: codigoReferidoFinal,
          productosSalonFisico,
          esReferidoInvitado,
          error: eOrd,
        };
      }
      const allOrders = Array.isArray(orders) ? orders : [];
      const orderById = new Map(allOrders.map((o) => [String(o.id), o]));
      const orderIds = allOrders.map((o) => o.id).filter(Boolean);

      let productosAppEfectivoRetiro = 0;
      let productosAppTarjetaDelivery = 0;
      let productosAppEfectivoRetiroPendiente = 0;
      let productosAppTarjetaDeliveryPendiente = 0;
      let orderLines = [];
      if (orderIds.length) {
        const { data: lines, error: eItems } = await supabase
          .from('ecommerce_order_items')
          .select('qty, order_id, product:inventario(notas)')
          .in('order_id', orderIds);
        if (!eItems && Array.isArray(lines)) {
          orderLines = lines;
          const tallies = tallyAndreasProductoPuntos(allOrders, lines, orderById);
          productosAppEfectivoRetiro = tallies.efectivoRetiro;
          productosAppTarjetaDelivery = tallies.tarjetaDelivery;
          productosAppEfectivoRetiroPendiente = tallies.efectivoRetiroPendiente;
          productosAppTarjetaDeliveryPendiente = tallies.tarjetaDeliveryPendiente;
        }
      }

      let citasVerificadas = 0;
      let citasPendientes = 0;
      const { data: citas, error: eCit } = await supabase
        .from('citas')
        .select('estado, visita_qr_token, visita_validada_en, fecha_hora')
        .eq('cliente_id', clienteRow.id);
      if (!eCit && Array.isArray(citas)) {
        const cc = countCitasPremios(citas);
        citasVerificadas = cc.verificadas;
        citasPendientes = cc.pendientes;
      }

      const refInv = parseReferidoInvitadoState(ap);
      const referidoInvitado = esReferidoInvitado && refInv.invitado;

      let referidosPrimeraCompra = 0;
      let rpcMissing = false;
      const { data: refCount, error: eRpc } = await supabase.rpc('premios_andreas_referidos_primera_compra', {
        p_referidor: clientUserId,
      });
      if (eRpc) {
        if (isPremiosSoftDbError(eRpc)) rpcMissing = true;
        else
          return {
            ...empty,
            codigoReferido: codigoReferidoFinal,
            productosSalonFisico,
            productosAppEfectivoRetiro,
            productosAppTarjetaDelivery,
            citasVerificadas,
            error: eRpc,
          };
      } else if (refCount != null) {
        referidosPrimeraCompra = Math.max(0, Math.floor(Number(refCount) || 0));
      }

      let referidosCiclo = 0;
      const st = parseReferidosPremiosState(ap);
      referidosCiclo = st.ciclo;
      const { data: refResumen, error: eResumen } = await supabase.rpc('premios_andreas_referidos_resumen', {
        p_referidor: clientUserId,
      });
      if (eResumen && isPremiosSoftDbError(eResumen)) rpcMissing = true;
      if (refResumen && typeof refResumen === 'object' && refResumen.en_ciclo != null) {
        referidosPrimeraCompra = Math.max(0, Math.floor(Number(refResumen.en_ciclo) || 0));
        referidosCiclo = Math.max(0, Math.min(2, Math.floor(Number(refResumen.ciclo) || 0)));
      } else if (!eRpc) {
        referidosPrimeraCompra = st.enCiclo;
      }

      const membresiaMeta =
        meta.appEfectivoRetiro ??
        (clienteRow.membresia_nivel === 'bronce'
          ? 7
          : clienteRow.membresia_nivel === 'plata'
            ? 6
            : clienteRow.membresia_nivel === 'vip'
              ? 5
              : ANDREAS_META.appEfectivoRetiro);

      let apWorking = ap && typeof ap === 'object' ? { ...ap } : {};
      const citasMeta = andreasMetaCitasForMembresia(clienteRow.membresia_nivel);
      const citasRuleBefore = getReglasState(apWorking).reglas[PREMIO_REGLA.CITAS];
      if (citasRuleBefore?.canje_pendiente) {
        const consumidoId = await findCitasCanjeConsumidoId(clienteRow.id);
        if (consumidoId) {
          apWorking = syncReglaCitasOnCanjeRedeemed(
            apWorking,
            consumidoId,
            citasVerificadas,
            citasMeta,
            clienteRow.membresia_nivel,
          );
        }
      }
      apWorking = syncReglaCitas(apWorking, citasVerificadas, citasMeta, clienteRow.membresia_nivel);
      apWorking = syncReglasProductosFromPedidos(
        apWorking,
        allOrders,
        orderLines,
        membresiaMeta,
        clienteRow.membresia_nivel,
      );
      const salonMeta = andreasMetaSalonForMembresia(clienteRow.membresia_nivel);
      apWorking = ensureSalonFisicoCanjeEnAp(apWorking, clienteRow.membresia_nivel);

      const counts = buildPremiosCountsFromReglas(apWorking, {
        productosAppEfectivoRetiro,
        productosAppTarjetaDelivery,
        productosAppEfectivoRetiroPendiente,
        productosAppTarjetaDeliveryPendiente,
        citasVerificadas,
        citasPendientes,
        productosSalonFisico,
      });

      const referidosTotalValidados =
        refResumen && typeof refResumen === 'object' && refResumen.total_validados != null
          ? Math.max(0, Math.floor(Number(refResumen.total_validados) || 0))
          : null;
      const referidosCanjePendiente = resolveReferidosCanjePendiente(apWorking, referidosTotalValidados);
      const canjePendiente = {
        ...counts.canjePendiente,
        ...(referidosCanjePendiente ? { referidos: referidosCanjePendiente } : {}),
      };

      const apPersistNeeded =
        JSON.stringify(apWorking.reglas) !== JSON.stringify(ap?.reglas) ||
        JSON.stringify(apWorking.salon_fisico_canje_pendiente) !==
          JSON.stringify(ap?.salon_fisico_canje_pendiente);
      if (apPersistNeeded) {
        void supabase
          .from('clientes')
          .update({ andreas_premios: apWorking })
          .eq('id', clienteRow.id);
      }

      return {
        productosAppEfectivoRetiro: counts.productosAppEfectivoRetiro,
        productosAppTarjetaDelivery: counts.productosAppTarjetaDelivery,
        productosAppEfectivoRetiroPendiente: counts.productosAppEfectivoRetiroPendiente,
        productosAppTarjetaDeliveryPendiente: counts.productosAppTarjetaDeliveryPendiente,
        citasVerificadas: counts.citasVerificadas,
        citasPendientes: counts.citasPendientes,
        productosSalonFisico: counts.productosSalonFisico,
        canjePendiente,
        referidosPrimeraCompra,
        referidosCiclo,
        esReferidoInvitado,
        referidoInvitado,
        codigoReferido: codigoReferidoFinal,
        meta,
        error: null,
        rpcMissing,
      };
    },

    getCanjeCheckout: async ({ clienteRow, shipId, payment_method }) => {
      if (!clienteRow?.id) return { data: null, error: null };
      const { cliente } = await hydrateAndreasPremiosForCanje(clienteRow);
      const pending = resolveCheckoutCanjeParaCliente(cliente, { payment_method, shipId });
      return { data: pending, error: null };
    },

    getCanjeCitaAgenda: async ({ clienteRow }) => {
      if (!clienteRow?.id) return { data: null, error: null };
      const { cliente, citasVerificadas, referidosTotalValidados } =
        await hydrateAndreasPremiosForCanje(clienteRow);
      const canje = resolveCitasCanjeParaCliente(cliente, citasVerificadas, referidosTotalValidados);
      if (!canje) return { data: null, error: null };
      return {
        data: {
          rule_id: canje.rule_id || canje.ruleId,
          ruleId: canje.ruleId || canje.rule_id,
          descuento_pct: canje.descuento_pct,
          meta: canje.meta,
          ciclo: canje.ciclo,
        },
        error: null,
      };
    },

    registrarCanjeCitaAgendada: async ({ clienteId, citaId, ruleId, referidosCiclo }) => {
      if (!clienteId || !citaId) {
        return { data: null, error: { message: 'Datos incompletos' } };
      }
      const { data: row, error: e0 } = await supabase
        .from('clientes')
        .select('andreas_premios, membresia_nivel')
        .eq('id', clienteId)
        .maybeSingle();
      if (e0 || !row) return { data: null, error: e0 || { message: 'Sin cliente' } };

      const rid = String(ruleId || PREMIO_REGLA.CITAS).trim();
      let apNext = row.andreas_premios;
      if (rid === PREMIO_REGLA.REFERIDOS) {
        apNext = syncReferidosOnCanjeRedeemed(row.andreas_premios, citaId, referidosCiclo);
      } else {
        const meta = andreasMetaCitasForMembresia(row.membresia_nivel);
        const citasVerificadas = await countCitasVerificadasCliente(clienteId);
        apNext = syncReglaCitasOnCanjeRedeemed(
          row.andreas_premios,
          citaId,
          citasVerificadas,
          meta,
          row.membresia_nivel,
        );
      }
      const { data, error } = await supabase
        .from('clientes')
        .update({ andreas_premios: apNext })
        .eq('id', clienteId)
        .select('andreas_premios')
        .maybeSingle();
      return { data, error };
    },

    syncReglasPedidoEntregado: async ({ clienteId, orderId }) => {
      if (!clienteId || !orderId) return { data: null, error: { message: 'Datos incompletos' } };

      const { data: rpcData, error: rpcErr } = await supabase.rpc('premios_andreas_sync_pedido_entregado', {
        p_order_id: orderId,
      });
      if (!rpcErr && rpcData && (rpcData.ok === true || rpcData.skip === true)) {
        return { data: rpcData, error: null };
      }
      if (rpcErr && !/function|does not exist|42883/i.test(String(rpcErr.message || ''))) {
        if (__DEV__) console.warn('[premios] premios_andreas_sync_pedido_entregado', rpcErr);
      }

      const { data: row, error: e0 } = await supabase
        .from('clientes')
        .select('id, membresia_nivel, andreas_premios')
        .eq('id', clienteId)
        .maybeSingle();
      if (e0 || !row) return { data: null, error: e0 || { message: 'Sin cliente' } };

      const { data: order, error: eOrd } = await db.orders.getById(orderId);
      if (eOrd || !order) return { data: null, error: eOrd || { message: 'Sin pedido' } };

      const { data: lines, error: eLin } = await db.ecommerceOrderItems.getByOrder(orderId);
      if (eLin) return { data: null, error: eLin };

      const meta =
        row.membresia_nivel === 'bronce'
          ? 7
          : row.membresia_nivel === 'plata'
            ? 6
            : row.membresia_nivel === 'vip'
              ? 5
              : ANDREAS_META.appEfectivoRetiro;

      const qty = countProductoQtyInOrder(lines, orderId);
      let apNext = row.andreas_premios;
      const canjeSnap = parseCanjeFromCheckoutSnapshot(order.checkout_snapshot);

      if (canjeSnap?.rule_id) {
        apNext = syncReglaOnCanjeRedeemed(
          apNext,
          canjeSnap.rule_id,
          orderId,
          qty,
          meta,
          row.membresia_nivel,
        );
      } else {
        apNext = syncReglaOnPedidoDelivered(apNext, order, qty, meta, row.membresia_nivel);
      }

      const { data, error } = await supabase
        .from('clientes')
        .update({ andreas_premios: apNext })
        .eq('id', clienteId)
        .select('andreas_premios')
        .maybeSingle();
      return { data, error };
    },

    getSalonCanjeParaVenta: async ({ clienteRow, clienteId }) => {
      const id = clienteRow?.id || clienteId;
      if (!id) return { data: null, error: null };
      const { data: row, error } = await supabase
        .from('clientes')
        .select('id, user_id, nombre, andreas_premios, membresia_nivel')
        .eq('id', id)
        .maybeSingle();
      if (error || !row) return { data: null, error: error || null };
      if (!row.user_id) return { data: null, error: null };

      let ap = row.andreas_premios;
      const apNorm = ensureSalonFisicoCanjeEnAp(ap, row.membresia_nivel);
      if (JSON.stringify(apNorm) !== JSON.stringify(ap)) {
        ap = apNorm;
        await supabase.from('clientes').update({ andreas_premios: ap }).eq('id', id);
      }
      return { data: resolveSalonCanjeParaCliente({ ...row, andreas_premios: ap }), error: null };
    },

    getCitasCanjeParaVenta: async ({ clienteRow, clienteId }) => {
      const id = clienteRow?.id || clienteId;
      if (!id) return { data: null, error: null };

      const { cliente, citasVerificadas, referidosTotalValidados } =
        await hydrateAndreasPremiosForCanje(clienteRow?.id ? clienteRow : { id });

      const canje = resolveCitasCanjeParaCliente(cliente, citasVerificadas, referidosTotalValidados);
      return { data: canje, error: null };
    },

    registrarCanjeCitasVenta: async ({ clienteId, ventaId, ruleId, referidosCiclo }) => {
      if (!clienteId || !ventaId) {
        return { data: null, error: { message: 'Datos incompletos' } };
      }
      const { data: row, error: e0 } = await supabase
        .from('clientes')
        .select('andreas_premios, membresia_nivel')
        .eq('id', clienteId)
        .maybeSingle();
      if (e0 || !row) return { data: null, error: e0 };
      const rid = String(ruleId || PREMIO_REGLA.CITAS).trim();
      let apNext = row.andreas_premios;
      if (rid === PREMIO_REGLA.REFERIDOS) {
        apNext = syncReferidosOnCanjeRedeemed(row.andreas_premios, ventaId, referidosCiclo);
      } else {
        const meta = andreasMetaCitasForMembresia(row.membresia_nivel);
        const citasVerificadas = await countCitasVerificadasCliente(clienteId);
        apNext = syncReglaCitasOnCanjeRedeemed(
          row.andreas_premios,
          ventaId,
          citasVerificadas,
          meta,
          row.membresia_nivel,
        );
      }
      const { data, error } = await supabase
        .from('clientes')
        .update({ andreas_premios: apNext })
        .eq('id', clienteId)
        .select('andreas_premios')
        .maybeSingle();
      return { data, error };
    },

    registrarCanjeSalonFisicoVenta: async ({ clienteId, ventaId, productQty }) => {
      if (!clienteId || !ventaId) {
        return { data: null, error: { message: 'Datos incompletos' } };
      }
      const qty = Math.max(1, Math.floor(Number(productQty) || 1));
      const { data: row, error: e0 } = await supabase
        .from('clientes')
        .select('andreas_premios, membresia_nivel')
        .eq('id', clienteId)
        .maybeSingle();
      if (e0 || !row) return { data: null, error: e0 };
      const meta = andreasMetaSalonForMembresia(row.membresia_nivel);
      const apNext = syncSalonFisicoOnCanjeRedeemed(
        row.andreas_premios,
        qty,
        meta,
        row.membresia_nivel,
        ventaId,
      );
      const { data, error } = await supabase
        .from('clientes')
        .update({ andreas_premios: apNext })
        .eq('id', clienteId)
        .select('andreas_premios')
        .maybeSingle();
      return { data, error };
    },

    canjearSalonFisicoEnRecepcion: async (clienteId) => {
      if (!clienteId) return { data: null, error: { message: 'Cliente no indicado' } };
      const { data: row, error: e0 } = await supabase
        .from('clientes')
        .select('andreas_premios, membresia_nivel')
        .eq('id', clienteId)
        .maybeSingle();
      if (e0 || !row) return { data: null, error: e0 };
      const meta = andreasMetaSalonForMembresia(row.membresia_nivel);
      const { syncSalonFisicoOnCanje } = await import('./andreasPremiosCycles.js');
      const apNext = syncSalonFisicoOnCanje(row.andreas_premios, meta, row.membresia_nivel);
      const { data, error } = await supabase
        .from('clientes')
        .update({ andreas_premios: apNext })
        .eq('id', clienteId)
        .select()
        .maybeSingle();
      return { data, error };
    },

    /** Aviso en app al invitado referido (compras, citas, bienvenida). */
    notifyReferidoAccion: async ({ clientUserId, clienteId, titulo, mensaje, targetScreen = 'premios' }) => {
      if (!clientUserId) return { data: null, error: { message: 'Sin usuario' } };
      const { enqueueClientNotification } = await import('./clientNotifications.js');
      return enqueueClientNotification({
        clientUserId,
        clienteId,
        tipo: 'premios',
        titulo,
        mensaje,
        targetScreen,
      });
    },

    /** Registra unidades de producto compradas en salón físico (staff · columna andreas_premios). */
    updateSalonFisicoUnidades: async (clienteId, unidades) => {
      if (!clienteId) return { data: null, error: { message: 'Cliente no indicado' } };
      const n = Math.max(0, Math.floor(Number(unidades) || 0));
      const { data: row, error: e0 } = await supabase
        .from('clientes')
        .select('andreas_premios')
        .eq('id', clienteId)
        .maybeSingle();
      if (e0) return { data: null, error: e0 };
      const meta = andreasMetaSalonForMembresia(row?.membresia_nivel);
      const next = markSalonFisicoCanjePendiente(row?.andreas_premios, n, meta, row?.membresia_nivel);
      const { data, error } = await supabase
        .from('clientes')
        .update({ andreas_premios: next })
        .eq('id', clienteId)
        .select()
        .single();
      return { data, error };
    },

    addSalonFisicoUnidades: async (clienteId, delta = 1) => {
      if (!clienteId) return { data: null, error: { message: 'Cliente no indicado' } };
      const d = Math.max(0, Math.floor(Number(delta) || 0));
      if (d < 1) return { data: null, error: { message: 'Cantidad inválida' } };
      const { data: row, error: e0 } = await supabase
        .from('clientes')
        .select('andreas_premios')
        .eq('id', clienteId)
        .maybeSingle();
      if (e0) return { data: null, error: e0 };
      const cur = parseSalonFisicoUnidades(row?.andreas_premios);
      return db.premiosAndreas.updateSalonFisicoUnidades(clienteId, cur + d);
    },

    /** Tras registrar venta en salón: suma productos a salon_fisico_unidades si el cliente tiene app. */
    procesarVentaSalonFisico: async (ventaId) => {
      if (!ventaId) return { data: null, error: { message: 'Venta no indicada' } };
      const { data, error } = await supabase.rpc('premios_andreas_procesar_venta_salon', {
        p_venta_id: ventaId,
      });
      if (error && /function|does not exist|42883/i.test(String(error.message || ''))) {
        return { data: null, error, rpcMissing: true };
      }
      return { data, error };
    },
  },

  // ==================== MEMBRESÍAS (Bronce / Plata / VIP) ====================
  membresias: {
    crearCodigo: async ({ nivel, clienteId, notas, codigo }) => {
      const { buildMembresiaCodigo, isMembresiaNivelValid } = await import('./membresias.js');
      if (!isMembresiaNivelValid(nivel)) {
        return { data: null, error: { message: 'Nivel de membresía no válido.' } };
      }
      if (!clienteId) {
        return { data: null, error: { message: 'Seleccioná un cliente.' } };
      }
      const code = codigo || buildMembresiaCodigo(nivel);
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('membresia_codigos')
        .insert({
          codigo: code,
          nivel: String(nivel).toLowerCase(),
          cliente_id: clienteId,
          activo: true,
          notas: notas || null,
          creado_por: userData?.user?.id || null,
        })
        .select()
        .single();
      return { data, error };
    },

    listCodigosPendientes: async (clienteId) => {
      return await supabase
        .from('membresia_codigos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('activo', true)
        .is('usado_en', null)
        .order('created_at', { ascending: false });
    },

    /** Cliente manual (sin app): el salón asigna el nivel directo en la ficha. */
    asignarDirecta: async ({ clienteId, nivel }) => {
      const { isMembresiaNivelValid } = await import('./membresias.js');
      const id = String(nivel || '').toLowerCase();
      if (!isMembresiaNivelValid(id)) {
        return { data: null, error: { message: 'Nivel de membresía no válido.' } };
      }
      if (!clienteId) {
        return { data: null, error: { message: 'Cliente no indicado.' } };
      }
      const categoria =
        id === 'vip' ? 'VIP' : id === 'plata' ? 'Plata' : id === 'bronce' ? 'Bronce' : undefined;
      const vence = new Date();
      vence.setDate(vence.getDate() + 29);
      const patch = {
        membresia_nivel: id,
        membresia_activada_en: new Date().toISOString(),
        membresia_vence_en: vence.toISOString(),
      };
      if (categoria) patch.categoria = categoria;
      return db.clientes.update(clienteId, patch);
    },

    canjearCodigo: async (codigo) => {
      const { normalizeMembresiaCodigoInput } = await import('./membresias.js');
      const normalized = normalizeMembresiaCodigoInput(codigo);
      if (!normalized) {
        return { data: null, error: { message: 'Ingresá el código que te dio el salón.' } };
      }
      const { data, error } = await supabase.rpc('redeem_membresia_codigo', { p_codigo: normalized });
      if (error) return { data: null, error };
      const payload = data && typeof data === 'object' ? data : {};
      if (payload.ok === false) {
        return { data: null, error: { message: payload.error || 'No se pudo activar el código.' } };
      }
      return { data: payload, error: null };
    },

    syncVigencia: async (clienteId = null) => {
      const { data, error } = await supabase.rpc('sync_membresia_cliente', {
        p_cliente_id: clienteId,
      });
      if (error) return { data: null, error };
      return { data: data && typeof data === 'object' ? data : {}, error: null };
    },
  },

  referidosAndreas: {
    checkoutInfo: async (userId = null) => {
      const { data, error } = await supabase.rpc('cliente_referidor_checkout_info', {
        p_user_id: userId,
      });
      if (error) return { data: null, error };
      return { data: data && typeof data === 'object' ? data : {}, error: null };
    },
    registrarInvitacion: async (clienteId) => {
      if (!clienteId) return { data: null, error: { message: 'Sin cliente' } };
      const { data, error } = await supabase.rpc('referido_registrar_invitacion', {
        p_cliente_id: clienteId,
      });
      return { data, error };
    },
  },

  // ==================== SERVICIOS ====================
  servicios: {
    /**
     * Catálogo `servicios`: sin texto devuelve los primeros `limit` por nombre;
     * con texto filtra por nombre (ilike).
     */
    search: async (query = '', limit = 60) => {
      const q = String(query || '').trim();
      let req = supabase
        .from('servicios')
        .select('id, nombre, precio, duracion_minutos')
        .order('nombre', { ascending: true })
        .limit(limit);
      if (q.length > 0) {
        req = req.ilike('nombre', `%${q}%`);
      }
      return await req;
    },

    /** Agenda: inventario (productos + servicios) + tabla servicios legacy. */
    listForAgenda: async (query = '', limit = 400) => {
      const q = String(query || '').trim().toLowerCase();
      const items = [];

      const matchesQuery = (item) => {
        if (!q) return true;
        const blob = [item.nombre, item.categoria, item.barcode, item.articuloTipo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const words = q.split(/\s+/).filter(Boolean);
        return words.every((w) => blob.includes(w));
      };

      const { data: invRows, error: invErr } = await supabase
        .from('inventario')
        .select('*')
        .order('nombre')
        .limit(limit);

      if (!invErr && Array.isArray(invRows)) {
        for (const row of invRows) {
          const item = inventarioRowToAgendaItem(row);
          if (!item || !matchesQuery(item)) continue;
          items.push(item);
        }
      }

      let svcReq = supabase
        .from('servicios')
        .select('id, nombre, precio, duracion_minutos')
        .order('nombre', { ascending: true })
        .limit(limit);
      if (q) {
        svcReq = svcReq.ilike('nombre', `%${String(query || '').trim()}%`);
      }
      const { data: svcRows, error: svcErr } = await svcReq;

      const invNames = new Set(items.map((i) => i.nombre.toLowerCase()));
      if (!svcErr && Array.isArray(svcRows)) {
        for (const row of svcRows) {
          const nombre = String(row.nombre || '').trim();
          if (!nombre) continue;
          if (invNames.has(nombre.toLowerCase())) continue;
          const item = {
            id: `svc-${row.id}`,
            servicioId: row.id,
            nombre,
            precio: Number(row.precio) || 0,
            duracion_minutos: Number(row.duracion_minutos) || 60,
            articuloTipo: 'servicio',
            categoria: '',
            barcode: '',
            stock_actual: null,
            source: 'servicios',
          };
          if (!matchesQuery(item)) continue;
          items.push(item);
        }
      }

      items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
      // No bloquear inventario si la tabla legacy `servicios` falla (RLS ausente, etc.).
      return { data: items, error: invErr || (items.length === 0 ? svcErr : null) };
    },

    create: async (data) => {
      return await supabase
        .from('servicios')
        .insert({
          nombre: data.nombre,
          precio: data.precio ?? 0,
          duracion_minutos: data.duracion_minutos ?? 60,
        })
        .select('id, nombre, precio, duracion_minutos')
        .single();
    },

    update: async (id, data) => {
      return await supabase
        .from('servicios')
        .update(data)
        .eq('id', id)
        .select('id, nombre, precio, duracion_minutos')
        .single();
    },

    /** Tras guardar inventario tipo servicio, refleja en tabla servicios (agenda) si existe. */
    syncFromInventario: async ({ nombre, precio_venta, notas }) => {
      const serviciosTableMissing = (err) => {
        const msg = String(err?.message || err || '');
        return (
          err?.code === 'PGRST205' ||
          msg.includes('Could not find the table') ||
          msg.includes("'public.servicios'")
        );
      };

      const { meta } = splitNotas(notas);
      if (meta.articuloTipo !== 'servicio') {
        return { data: null, error: null, skipped: true };
      }
      const nombreTrim = String(nombre || '').trim();
      if (!nombreTrim) {
        return { error: { message: 'Nombre de servicio vacío' } };
      }
      const precio = Number(precio_venta) || 0;
      const duracion_minutos = parseDuracionMinutosFromMeta(meta);

      const { data: candidates, error: findErr } = await supabase
        .from('servicios')
        .select('id, nombre')
        .ilike('nombre', nombreTrim)
        .limit(10);
      if (findErr) {
        if (serviciosTableMissing(findErr)) return { data: null, error: null, skipped: true };
        return { error: findErr };
      }

      const key = nombreTrim.toLowerCase();
      const existing = (candidates || []).find((r) => String(r.nombre || '').trim().toLowerCase() === key);

      if (existing?.id) {
        const upd = await supabase
          .from('servicios')
          .update({ precio, duracion_minutos, nombre: nombreTrim })
          .eq('id', existing.id)
          .select('id, nombre, precio, duracion_minutos')
          .single();
        if (upd.error && serviciosTableMissing(upd.error)) {
          return { data: null, error: null, skipped: true };
        }
        return upd;
      }

      const created = await db.servicios.create({ nombre: nombreTrim, precio, duracion_minutos });
      if (created.error && serviciosTableMissing(created.error)) {
        return { data: null, error: null, skipped: true };
      }
      return created;
    },
  },

  // ==================== CITAS ====================
  citas: {
    // Obtener todas las citas
    getAll: async () => {
      let q = supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email, user_id, tipo_registro),
          empleado:empleados(id, nombre)
        `)
        .order('fecha_hora', { ascending: false });
      q = applySalonSucursalFilter(q);
      return await q;
    },

    // Obtener citas por fecha
    getByDate: async (fecha) => {
      const startOfDay = new Date(fecha);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(fecha);
      endOfDay.setHours(23, 59, 59, 999);

      let q = supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .gte('fecha_hora', startOfDay.toISOString())
        .lte('fecha_hora', endOfDay.toISOString())
        .order('fecha_hora');
      q = applySalonSucursalFilter(q);
      return await q;
    },

    // Obtener citas por rango de fechas
    getByDateRange: async (startDate, endDate) => {
      let q = supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .gte('fecha_hora', startDate)
        .lte('fecha_hora', endDate)
        .order('fecha_hora');
      q = applySalonSucursalFilter(q);
      return await q;
    },

    // Obtener citas de un cliente ({ forClientApp: true } evita join empleados — RLS app clientes)
    getByCliente: async (clienteId, options = {}) => {
      const forClientApp = options.forClientApp === true;
      let q = supabase
        .from('citas')
        .select(forClientApp ? '*' : `*, empleado:empleados(id, nombre)`)
        .eq('cliente_id', clienteId)
        .order('fecha_hora', { ascending: true });
      if (forClientApp) {
        const sid = await getClientSucursalId();
        if (sid) q = q.eq('sucursal_id', sid);
      } else {
        q = applySalonSucursalFilter(q);
      }
      return await q;
    },

    // Obtener citas de un empleado
    getByEmpleado: async (empleadoId) => {
      let q = supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email)
        `)
        .eq('empleado_id', empleadoId)
        .order('fecha_hora');
      q = applySalonSucursalFilter(q);
      return await q;
    },

    // Obtener citas por estado
    getByEstado: async (estado) => {
      let q = supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .eq('estado', estado)
        .order('fecha_hora');
      q = applySalonSucursalFilter(q);
      return await q;
    },

    search: async (query, limit = 20) => {
      const q = String(query || '')
        .trim()
        .replace(/[%(),]/g, '')
        .slice(0, 80);
      if (!q) return { data: [], error: null };

      const select = `
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `;
      const cap = Math.max(1, Math.min(40, Math.floor(Number(limit) || 20)));

      const { data: byFields, error: eFields } = await supabase
        .from('citas')
        .select(select)
        .or(`servicio.ilike.%${q}%,notas_servicio.ilike.%${q}%,estado.ilike.%${q}%`)
        .order('fecha_hora', { ascending: false })
        .limit(cap);

      const [{ data: clientes }, { data: empleados }] = await Promise.all([
        supabase
          .from('clientes')
          .select('id')
          .or(`nombre.ilike.%${q}%,telefono.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(20),
        supabase
          .from('empleados')
          .select('id')
          .or(`nombre.ilike.%${q}%,telefono.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(15),
      ]);

      const clienteIds = (Array.isArray(clientes) ? clientes : []).map((c) => c.id).filter(Boolean);
      const empleadoIds = (Array.isArray(empleados) ? empleados : []).map((e) => e.id).filter(Boolean);

      const extraRows = [];
      if (clienteIds.length) {
        const { data } = await supabase
          .from('citas')
          .select(select)
          .in('cliente_id', clienteIds)
          .order('fecha_hora', { ascending: false })
          .limit(cap);
        if (Array.isArray(data)) extraRows.push(...data);
      }
      if (empleadoIds.length) {
        const { data } = await supabase
          .from('citas')
          .select(select)
          .in('empleado_id', empleadoIds)
          .order('fecha_hora', { ascending: false })
          .limit(cap);
        if (Array.isArray(data)) extraRows.push(...data);
      }

      const byId = new Map();
      for (const row of [...(Array.isArray(byFields) ? byFields : []), ...extraRows]) {
        if (row?.id) byId.set(row.id, row);
      }
      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.fecha_hora || 0).getTime() - new Date(a.fecha_hora || 0).getTime(),
      );
      return { data: merged.slice(0, cap), error: eFields };
    },

    // Crear nueva cita
    create: async (data, options = {}) => {
      const forClientApp = options.forClientApp === true;
      const scope = getSalonSucursalScope();
      const clientSucursal = forClientApp ? await ensureClientSucursalId() : null;
      const sucursalId =
        data.sucursal_id ||
        clientSucursal ||
        (!scope.isGlobal ? scope.sucursalId : null) ||
        null;
      const insert = supabase.from('citas').insert({
        cliente_id: data.cliente_id,
        servicio: data.servicio,
        precio: data.precio || 0,
        duracion_minutos: data.duracion_minutos || 30,
        fecha_hora: data.fecha_hora,
        estado: data.estado || 'pendiente',
        notas_servicio: data.notas_servicio || null,
        empleado_id: data.empleado_id || null,
        sucursal_id: sucursalId,
      });
      if (forClientApp) {
        return await insert.select('*').single();
      }
      return await insert
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .single();
    },

    // Actualizar cita
    update: async (id, data, options = {}) => {
      const forClientApp = options.forClientApp === true;
      const q = supabase.from('citas').update(data).eq('id', id);
      if (forClientApp) {
        return await q.select('*').single();
      }
      return await q
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .single();
    },

    // Actualizar estado de cita
    updateEstado: async (id, estado) => {
      return await supabase
        .from('citas')
        .update({ estado })
        .eq('id', id)
        .select()
        .single();
    },

    // Marcar cita como completada y venta generada
    completar: async (id) => {
      return await supabase
        .from('citas')
        .update({ 
          estado: 'completada',
          venta_generada: true 
        })
        .eq('id', id)
        .select()
        .single();
    },

    /** Genera o devuelve QR de visita si la cita está confirmada (app clientes o salón). */
    asegurarVisitaQr: async (citaId, options = {}) => {
      if (!citaId) return { data: null, error: { message: 'Sin cita' } };
      const { data, error } = await supabase.rpc('cita_asegurar_visita_qr', { p_cita_id: citaId });
      if (!error) {
        const token = data != null ? String(data).trim() : '';
        if (token) return { data: token, error: null };
      }
      if (!options.allowClientFallback) {
        return {
          data: null,
          error: error || { message: 'No se pudo generar el QR de visita.' },
        };
      }
      const msg = String(error?.message || error?.hint || '');
      const rpcMissing = /function|does not exist|schema cache|pgcrypto|gen_random_bytes/i.test(msg);
      if (error && !rpcMissing) {
        return { data: null, error };
      }
      const token = `V${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random()
        .toString(36)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6)}`;
      const { data: row, error: upErr } = await supabase
        .from('citas')
        .update({ visita_qr_token: token })
        .eq('id', citaId)
        .select('visita_qr_token')
        .single();
      if (upErr) {
        const upMsg = String(upErr.message || '');
        if (/visita_qr_token|column/i.test(upMsg)) {
          return {
            data: null,
            error: {
              message:
                'Falta configurar Supabase: ejecutá supabase-membresias-referidos-programa.sql en el SQL Editor.',
            },
          };
        }
        return { data: null, error: upErr };
      }
      const saved = String(row?.visita_qr_token || token).trim();
      return { data: saved || null, error: null };
    },

    /** Sincroniza QR para todas las citas confirmadas del cliente (sesión actual). */
    syncVisitaQrCliente: async () => {
      const { data, error } = await supabase.rpc('citas_sync_visita_qr_cliente');
      if (error) return { data: null, error };
      return { data: data && typeof data === 'object' ? data : {}, error: null };
    },

    // Cancelar cita
    cancelar: async (id, motivo = null, options = {}) => {
      const forClientApp = options.forClientApp === true;
      const q = supabase
        .from('citas')
        .update({
          estado: 'cancelada',
          notas_servicio: motivo,
        })
        .eq('id', id);
      if (forClientApp) {
        return await q.select('*').single();
      }
      return await q.select().single();
    },

    // Eliminar cita
    delete: async (id) => {
      return await supabase
        .from('citas')
        .delete()
        .eq('id', id);
    },

    // Obtener citas próximas (siguientes 7 días)
    getProximas: async () => {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      return await supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .gte('fecha_hora', now.toISOString())
        .lte('fecha_hora', nextWeek.toISOString())
        .eq('estado', 'pendiente')
        .order('fecha_hora');
    },

    // Obtener citas del día actual
    getHoy: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          empleado:empleados(id, nombre)
        `)
        .gte('fecha_hora', today.toISOString())
        .lt('fecha_hora', tomorrow.toISOString())
        .order('fecha_hora');
    },
  },

  // ==================== EMPLEADOS ====================
  empleados: {
    // Obtener todos los empleados
    getAll: async () => {
      return await supabase
        .from('empleados')
        .select('*')
        .order('nombre');
    },

    // Obtener solo empleados activos
    getActivos: async () => {
      return await supabase
        .from('empleados')
        .select('*')
        .eq('activo', true)
        .order('nombre');
    },

    // Obtener empleado por ID
    getById: async (id) => {
      return await supabase
        .from('empleados')
        .select('*')
        .eq('id', id)
        .single();
    },

    // Obtener empleados por rol
    getByRol: async (rol) => {
      return await supabase
        .from('empleados')
        .select('*')
        .eq('rol', rol)
        .eq('activo', true)
        .order('nombre');
    },

    // Buscar empleados
    search: async (query) => {
      return await supabase
        .from('empleados')
        .select('*')
        .or(`nombre.ilike.%${query}%,telefono.ilike.%${query}%,email.ilike.%${query}%`)
        .order('nombre');
    },

    // Crear nuevo empleado
    create: async (data) => {
      return await supabase
        .from('empleados')
        .insert({
          nombre: data.nombre,
          rol: data.rol || null,
          telefono: data.telefono || null,
          email: data.email || null,
          comision_porcentaje: data.comision_porcentaje || 0,
          tipo_registro: data.tipo_registro || 'manual',
          direccion: data.direccion || null,
          contacto_emergencia: data.contacto_emergencia || null,
          tel_emergencia: data.tel_emergencia || null,
          activo: data.activo !== undefined ? data.activo : true,
          foto_url: data.foto_url ?? null,
        })
        .select()
        .single();
    },

    // Actualizar empleado
    update: async (id, data) => {
      return await supabase
        .from('empleados')
        .update(data)
        .eq('id', id)
        .select()
        .single();
    },

    // Activar/Desactivar empleado
    setActivo: async (id, activo) => {
      return await supabase
        .from('empleados')
        .update({ activo })
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar empleado
    delete: async (id) => {
      return await supabase
        .from('empleados')
        .delete()
        .eq('id', id);
    },

    // Obtener citas de un empleado
    getCitas: async (empleadoId, startDate = null, endDate = null) => {
      let query = supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email)
        `)
        .eq('empleado_id', empleadoId)
        .order('fecha_hora', { ascending: false });

      if (startDate) {
        query = query.gte('fecha_hora', startDate);
      }
      if (endDate) {
        query = query.lte('fecha_hora', endDate);
      }

      return await query;
    },

    // Obtener estadísticas de un empleado
    getEstadisticas: async (empleadoId, mes = null, anio = null) => {
      let query = supabase
        .from('citas')
        .select('precio, estado, venta_generada')
        .eq('empleado_id', empleadoId);

      // Si se especifica mes/año, filtrar
      if (mes && anio) {
        const startDate = new Date(anio, mes - 1, 1);
        const endDate = new Date(anio, mes, 0, 23, 59, 59);
        query = query
          .gte('fecha_hora', startDate.toISOString())
          .lte('fecha_hora', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) return { error };

      // Calcular estadísticas
      const totalCitas = data.length;
      const citasCompletadas = data.filter(c => c.estado === 'completada').length;
      const ventasTotales = data
        .filter(c => c.venta_generada)
        .reduce((sum, c) => sum + Number(c.precio), 0);

      return {
        data: {
          totalCitas,
          citasCompletadas,
          ventasTotales,
          tasaCompletacion: totalCitas > 0 ? (citasCompletadas / totalCitas * 100).toFixed(1) : 0,
        },
        error: null,
      };
    },
  },

  // ==================== MOVIMIENTOS DE CAJA ====================
  movimientosCaja: {
    // Obtener todos los movimientos
    getAll: async () => {
      return await supabase
        .from('movimientos_caja')
        .select('*')
        .order('fecha', { ascending: false });
    },

    // Obtener movimientos de una caja
    getByCaja: async (cajaId) => {
      return await supabase
        .from('movimientos_caja')
        .select('*')
        .eq('caja_id', cajaId)
        .order('fecha', { ascending: false });
    },

    // Obtener movimiento por ID
    getById: async (id) => {
      return await supabase
        .from('movimientos_caja')
        .select('*')
        .eq('id', id)
        .single();
    },

    // Obtener movimientos por tipo
    getByTipo: async (tipo, cajaId = null) => {
      let query = supabase
        .from('movimientos_caja')
        .select('*')
        .eq('tipo', tipo)
        .order('fecha', { ascending: false });

      if (cajaId) {
        query = query.eq('caja_id', cajaId);
      }

      return await query;
    },

    // Obtener movimientos por fecha
    getByFecha: async (fecha, cajaId = null) => {
      const startOfDay = new Date(fecha);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(fecha);
      endOfDay.setHours(23, 59, 59, 999);

      let query = supabase
        .from('movimientos_caja')
        .select('*')
        .gte('fecha', startOfDay.toISOString())
        .lte('fecha', endOfDay.toISOString())
        .order('fecha', { ascending: false });

      if (cajaId) {
        query = query.eq('caja_id', cajaId);
      }

      return await query;
    },

    // Obtener movimientos por rango de fechas
    getByRangoFechas: async (startDate, endDate, cajaId = null) => {
      let query = supabase
        .from('movimientos_caja')
        .select('*')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false });

      if (cajaId) {
        query = query.eq('caja_id', cajaId);
      }

      return await query;
    },

    // Crear movimiento
    create: async (data) => {
      return await supabase
        .from('movimientos_caja')
        .insert({
          caja_id: data.caja_id,
          tipo: data.tipo, // 'ingreso', 'egreso', 'apertura', 'cierre', 'retiro'
          monto: data.monto,
          descripcion: data.descripcion || null,
        })
        .select()
        .single();
    },

    // Registrar ingreso
    registrarIngreso: async (cajaId, monto, descripcion) => {
      return await supabase
        .from('movimientos_caja')
        .insert({
          caja_id: cajaId,
          tipo: 'ingreso',
          monto: monto,
          descripcion: descripcion,
        })
        .select()
        .single();
    },

    // Registrar egreso
    registrarEgreso: async (cajaId, monto, descripcion) => {
      return await supabase
        .from('movimientos_caja')
        .insert({
          caja_id: cajaId,
          tipo: 'egreso',
          monto: monto,
          descripcion: descripcion,
        })
        .select()
        .single();
    },

    // Registrar apertura de caja
    registrarApertura: async (cajaId, montoInicial, descripcion) => {
      return await supabase
        .from('movimientos_caja')
        .insert({
          caja_id: cajaId,
          tipo: 'apertura',
          monto: montoInicial,
          descripcion: descripcion || 'Apertura de caja',
        })
        .select()
        .single();
    },

    // Registrar cierre de caja
    registrarCierre: async (cajaId, montoFinal, descripcion) => {
      return await supabase
        .from('movimientos_caja')
        .insert({
          caja_id: cajaId,
          tipo: 'cierre',
          monto: montoFinal,
          descripcion: descripcion || 'Cierre de caja',
        })
        .select()
        .single();
    },

    // Actualizar movimiento
    update: async (id, data) => {
      return await supabase
        .from('movimientos_caja')
        .update(data)
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar movimiento
    delete: async (id) => {
      return await supabase
        .from('movimientos_caja')
        .delete()
        .eq('id', id);
    },

    // Obtener movimientos de hoy
    getHoy: async (cajaId = null) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let query = supabase
        .from('movimientos_caja')
        .select('*')
        .gte('fecha', today.toISOString())
        .lt('fecha', tomorrow.toISOString())
        .order('fecha', { ascending: false });

      if (cajaId) {
        query = query.eq('caja_id', cajaId);
      }

      return await query;
    },

    // Calcular balance de una caja
    calcularBalance: async (cajaId, startDate = null, endDate = null) => {
      let query = supabase
        .from('movimientos_caja')
        .select('tipo, monto')
        .eq('caja_id', cajaId);

      if (startDate) {
        query = query.gte('fecha', startDate);
      }
      if (endDate) {
        query = query.lte('fecha', endDate);
      }

      const { data, error } = await query;

      if (error) return { error };

      const ingresos = data
        .filter(m => ['ingreso', 'apertura'].includes(m.tipo))
        .reduce((sum, m) => sum + Number(m.monto), 0);

      const egresos = data
        .filter(m => ['egreso', 'retiro', 'cierre'].includes(m.tipo))
        .reduce((sum, m) => sum + Number(m.monto), 0);

      const balance = ingresos - egresos;

      return {
        data: {
          ingresos: ingresos.toFixed(2),
          egresos: egresos.toFixed(2),
          balance: balance.toFixed(2),
          totalMovimientos: data.length,
        },
        error: null,
      };
    },

    // Estadísticas de movimientos
    getEstadisticas: async (cajaId, startDate = null, endDate = null) => {
      let query = supabase
        .from('movimientos_caja')
        .select('tipo, monto')
        .eq('caja_id', cajaId);

      if (startDate) {
        query = query.gte('fecha', startDate);
      }
      if (endDate) {
        query = query.lte('fecha', endDate);
      }

      const { data, error } = await query;

      if (error) return { error };

      const porTipo = data.reduce((acc, m) => {
        const tipo = m.tipo || 'otros';
        if (!acc[tipo]) {
          acc[tipo] = { cantidad: 0, total: 0 };
        }
        acc[tipo].cantidad++;
        acc[tipo].total += Number(m.monto);
        return acc;
      }, {});

      return {
        data: porTipo,
        error: null,
      };
    },
  },

  // ==================== NOTIFICACIONES ====================
  notificaciones: {
    // Obtener todas las notificaciones
    getAll: async () => {
      return await supabase
        .from('notificaciones')
        .select(`
          *,
          empleado:empleados(id, nombre)
        `)
        .order('created_at', { ascending: false });
    },

    // Obtener notificaciones de un empleado
    getByEmpleado: async (empleadoId) => {
      return await supabase
        .from('notificaciones')
        .select('*')
        .eq('empleado_id', empleadoId)
        .order('created_at', { ascending: false });
    },

    // Obtener notificaciones no leídas de un empleado
    getNoLeidasByEmpleado: async (empleadoId) => {
      return await supabase
        .from('notificaciones')
        .select('*')
        .eq('empleado_id', empleadoId)
        .eq('leida', false)
        .order('created_at', { ascending: false });
    },

    // Obtener notificaciones por tipo
    getByTipo: async (tipo, empleadoId = null) => {
      let query = supabase
        .from('notificaciones')
        .select('*')
        .eq('tipo', tipo)
        .order('created_at', { ascending: false });

      if (empleadoId) {
        query = query.eq('empleado_id', empleadoId);
      }

      return await query;
    },

    // Obtener notificación por ID
    getById: async (id) => {
      return await supabase
        .from('notificaciones')
        .select(`
          *,
          empleado:empleados(id, nombre)
        `)
        .eq('id', id)
        .single();
    },

    // Crear notificación
    create: async (data) => {
      return await supabase
        .from('notificaciones')
        .insert({
          empleado_id: data.empleado_id,
          titulo: data.titulo || null,
          mensaje: data.mensaje || null,
          tipo: data.tipo || null,
          target_screen: data.target_screen || null,
          target_id: data.target_id || null,
          leida: false,
        })
        .select()
        .single();
    },

    // Crear notificación masiva (para múltiples empleados)
    createBulk: async (empleadoIds, data) => {
      const notifications = empleadoIds.map(empleadoId => ({
        empleado_id: empleadoId,
        titulo: data.titulo,
        mensaje: data.mensaje,
        tipo: data.tipo || null,
        target_screen: data.target_screen || null,
        target_id: data.target_id || null,
        leida: false,
      }));

      return await supabase
        .from('notificaciones')
        .insert(notifications)
        .select();
    },

    // Marcar como leída
    marcarLeida: async (id) => {
      return await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', id)
        .select()
        .single();
    },

    // Marcar todas como leídas para un empleado
    marcarTodasLeidas: async (empleadoId) => {
      return await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('empleado_id', empleadoId)
        .eq('leida', false);
    },

    // Marcar como no leída
    marcarNoLeida: async (id) => {
      return await supabase
        .from('notificaciones')
        .update({ leida: false })
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar notificación
    delete: async (id) => {
      return await supabase
        .from('notificaciones')
        .delete()
        .eq('id', id);
    },

    // Eliminar todas las notificaciones de un empleado
    deleteAllByEmpleado: async (empleadoId) => {
      return await supabase
        .from('notificaciones')
        .delete()
        .eq('empleado_id', empleadoId);
    },

    // Eliminar notificaciones leídas antiguas (cleanup)
    deleteOldLeidas: async (dias = 30) => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - dias);

      return await supabase
        .from('notificaciones')
        .delete()
        .eq('leida', true)
        .lt('created_at', fecha.toISOString());
    },

    // Contar notificaciones no leídas de un empleado
    countNoLeidas: async (empleadoId) => {
      const { count, error } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('empleado_id', empleadoId)
        .eq('leida', false);

      return { count: count || 0, error };
    },

    // Obtener notificaciones recientes (últimos N días)
    getRecientes: async (empleadoId, dias = 7) => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - dias);

      return await supabase
        .from('notificaciones')
        .select('*')
        .eq('empleado_id', empleadoId)
        .gte('created_at', fecha.toISOString())
        .order('created_at', { ascending: false });
    },

    // Suscribirse a cambios en tiempo real
    subscribeToEmpleado: (empleadoId, callback) => {
      return supabase
        .channel(`notificaciones:${empleadoId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notificaciones',
            filter: `empleado_id=eq.${empleadoId}`,
          },
          callback
        )
        .subscribe();
    },

    // Enviar notificación de nueva cita
    notificarNuevaCita: async (empleadoId, citaId, clienteNombre) => {
      return await supabase
        .from('notificaciones')
        .insert({
          empleado_id: empleadoId,
          titulo: 'Nueva Cita Asignada',
          mensaje: `Se te ha asignado una cita con ${clienteNombre}`,
          tipo: 'cita',
          target_screen: 'Citas',
          target_id: citaId,
          leida: false,
        })
        .select()
        .single();
    },

    // Enviar notificación de stock bajo
    notificarStockBajo: async (empleadoIds, productoNombre, stockActual) => {
      const notifications = empleadoIds.map(empleadoId => ({
        empleado_id: empleadoId,
        titulo: 'Alerta de Stock Bajo',
        mensaje: `El producto "${productoNombre}" tiene stock bajo (${stockActual} unidades)`,
        tipo: 'inventario',
        target_screen: 'Inventario',
        leida: false,
      }));

      return await supabase
        .from('notificaciones')
        .insert(notifications)
        .select();
    },

    // Estadísticas de notificaciones
    getEstadisticas: async (empleadoId) => {
      const { data } = await supabase
        .from('notificaciones')
        .select('leida, tipo')
        .eq('empleado_id', empleadoId);

      if (!data) return { error: 'Error al obtener notificaciones' };

      const total = data.length;
      const noLeidas = data.filter(n => !n.leida).length;
      const leidas = data.filter(n => n.leida).length;
      
      const porTipo = data.reduce((acc, n) => {
        const tipo = n.tipo || 'general';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      }, {});

      return {
        data: {
          total,
          noLeidas,
          leidas,
          porTipo,
        },
        error: null,
      };
    },
  },

  // ==================== PROFILES (Usuarios del Sistema) ====================
  profiles: {
    // Obtener todos los perfiles
    getAll: async () => {
      return await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
    },

    // Obtener perfil por ID (user_id de auth.users)
    getById: async (id) => {
      return await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
    },

    // Obtener perfil del usuario actual
    getCurrentProfile: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return { data: null, error: { message: 'No user logged in' } };

      return await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    },

    /** Vincula admin_sucursal (metadata, teléfono interno o id de sucursal). */
    finalizeBranchAdminSignup: async (sucursalId = null) => {
      const args = sucursalId ? { p_sucursal_id: sucursalId } : {};
      return await supabase.rpc('finalize_branch_admin_signup', args);
    },

    // Obtener perfiles por rol
    getByRole: async (role) => {
      return await supabase
        .from('profiles')
        .select('*')
        .eq('role', role)
        .order('full_name');
    },

    // Obtener todos los admins
    getAdmins: async () => {
      return await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('full_name');
    },

    // Perfiles con rol staff (legacy; el producto ya no usa staff en lógica de negocio)
    getStaff: async () => {
      return await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'staff')
        .order('full_name');
    },

    // Buscar perfiles
    search: async (query) => {
      return await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('full_name');
    },

    // Crear perfil (normalmente se hace automáticamente con trigger)
    create: async (data) => {
      const role = data.role || 'admin';
      if (!['admin', 'admin_global', 'admin_sucursal', 'staff'].includes(role)) {
        return {
          data: null,
          error: { message: 'profiles solo admite cuentas del salón. Los clientes van en clientes.' },
        };
      }
      return await supabase
        .from('profiles')
        .insert({
          id: data.id, // UUID del auth.users
          full_name: data.full_name || null,
          role,
          phone: data.phone || null,
          address: data.address || null,
          birthday: data.birthday || null,
          age: data.age || null,
          photo_url: data.photo_url || null,
          marketing_access: data.marketing_access || false,
          app_scope: data.app_scope ?? 'staff',
          community_enabled: data.community_enabled !== undefined ? data.community_enabled : true,
        })
        .select()
        .single();
    },

    // Actualizar perfil
    update: async (id, data) => {
      return await supabase
        .from('profiles')
        .update(data)
        .eq('id', id)
        .select()
        .single();
    },

    // Actualizar perfil actual
    updateCurrent: async (data) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return { data: null, error: { message: 'No user logged in' } };

      return await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id)
        .select()
        .single();
    },

    // Roles permitidos en profiles: solo cuentas del salón.
    changeRole: async (userId, newRole) => {
      if (!['admin', 'admin_global', 'admin_sucursal', 'staff'].includes(newRole)) {
        return { error: { message: 'Rol no válido en profiles. Los clientes se gestionan en clientes.' } };
      }

      return await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single();
    },

    // Actualizar acceso a marketing
    setMarketingAccess: async (userId, enabled) => {
      return await supabase
        .from('profiles')
        .update({ marketing_access: enabled })
        .eq('id', userId)
        .select()
        .single();
    },

    // Actualizar acceso a comunidad
    setCommunityEnabled: async (userId, enabled) => {
      return await supabase
        .from('profiles')
        .update({ community_enabled: enabled })
        .eq('id', userId)
        .select()
        .single();
    },

    // Eliminar perfil
    delete: async (id) => {
      return await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
    },

    // Verificar si el usuario es admin
    isAdmin: async (userId = null) => {
      let id = userId;
      
      if (!id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        id = user.id;
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', id)
        .single();

      return isSalonAdminRole(data?.role);
    },

    // Obtener perfiles con marketing habilitado
    getWithMarketingAccess: async () => {
      return await supabase
        .from('profiles')
        .select('*')
        .eq('marketing_access', true)
        .order('full_name');
    },

    // Estadísticas de usuarios
    getEstadisticas: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('role, marketing_access, app_scope');

      if (!profiles) return { error: 'Error al obtener perfiles' };

      const totalUsuarios = profiles.length;
      const admins = profiles.filter((p) => p.role === 'admin').length;
      const otrosPerfiles = profiles.filter((p) => p.role !== 'admin').length;
      const legacyStaff = profiles.filter((p) => p.role === 'staff').length;
      const conMarketingAccess = profiles.filter((p) => p.marketing_access).length;

      return {
        data: {
          totalUsuarios,
          admins,
          otrosPerfiles,
          legacyStaff,
          conMarketingAccess,
        },
        error: null,
      };
    },
  },

  // ==================== VENTAS ====================
  ventas: {
    // Obtener todas las ventas
    getAll: async () => {
      let q = supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .order('fecha', { ascending: false });
      q = applySalonSucursalFilter(q);
      return await q;
    },

    // Obtener venta por ID
    getById: async (id) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email, categoria),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre, rol)
        `)
        .eq('id', id)
        .single();
    },

    // Obtener ventas por fecha
    getByFecha: async (fecha) => {
      const startOfDay = new Date(fecha);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(fecha);
      endOfDay.setHours(23, 59, 59, 999);

      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .gte('fecha', startOfDay.toISOString())
        .lte('fecha', endOfDay.toISOString())
        .order('fecha', { ascending: false });
    },

    // Obtener ventas por rango de fechas
    getByRangoFechas: async (startDate, endDate) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false });
    },

    // Obtener ventas de un cliente
    getByCliente: async (clienteId) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .eq('cliente_id', clienteId)
        .order('fecha', { ascending: false });
    },

    // Obtener ventas de un vendedor
    getByVendedor: async (vendedorId) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre)
        `)
        .eq('vendedor_id', vendedorId)
        .order('fecha', { ascending: false });
    },

    // Obtener ventas de una caja
    getByCaja: async (cajaId) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .eq('caja_id', cajaId)
        .order('fecha', { ascending: false });
    },

    // Obtener ventas por método de pago
    getByMetodoPago: async (metodoPago) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .eq('metodo_pago', metodoPago)
        .order('fecha', { ascending: false });
    },

    search: async (query, limit = 20) => {
      const q = String(query || '').trim();
      if (!q) return { data: [], error: null };
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .or(
          `no_factura.ilike.%${q}%,cliente_nombre.ilike.%${q}%,profesional.ilike.%${q}%,notas.ilike.%${q}%,metodo_pago.ilike.%${q}%`,
        )
        .order('fecha', { ascending: false })
        .limit(limit);
    },

    // Buscar ventas por número de factura
    getByFactura: async (noFactura) => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .eq('no_factura', noFactura)
        .single();
    },

    // Crear venta (`minimalReturn`: solo id — evita fallo .single() si el SELECT con joins no devuelve fila)
    create: async (data, options = {}) => {
      const scope = getSalonSucursalScope();
      const sucursalId =
        data.sucursal_id ||
        (!scope.isGlobal ? scope.sucursalId : null) ||
        null;
      if (!scope.isGlobal && !sucursalId) {
        return {
          data: null,
          error: {
            message:
              'Tu perfil admin_sucursal debe tener sucursal_id en profiles. Cerrá sesión y volvé a entrar.',
          },
        };
      }
      const payload = {
        cliente_id: data.cliente_id || null,
        cliente_nombre: data.cliente_nombre || null,
        profesional: data.profesional || null,
        total: data.total || 0,
        monto: data.monto || data.total || 0,
        metodo_pago: data.metodo_pago || null,
        items: data.items || null, // JSONB
        notas: data.notas || null,
        detalles_pago: data.detalles_pago || null,
        no_factura: data.no_factura || null,
        descuento: data.descuento || 0,
        vendedor_id: data.vendedor_id || null,
        caja_id: data.caja_id || null,
        sucursal_id: sucursalId,
      };
      const finishVenta = async (result) => {
        const ventaId = result?.data?.id;
        if (!result?.error && ventaId && !options.skipSalonFisicoPremios) {
          void db.premiosAndreas.procesarVentaSalonFisico(ventaId);
        }
        return result;
      };
      if (options.minimalReturn) {
        const r = await supabase.from('ventas').insert(payload).select('id').maybeSingle();
        return finishVenta(r);
      }
      const { data: row, error } = await supabase
        .from('ventas')
        .insert(payload)
        .select(`
          *,
          cliente:clientes(id, nombre, telefono),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .maybeSingle();
      if (row) return finishVenta({ data: row, error: null });
      if (error && !isPostgrestSingleRowError(error)) return { data: null, error };
      const r2 = await supabase.from('ventas').insert(payload).select('id').maybeSingle();
      return finishVenta(r2);
    },

    // Actualizar venta
    update: async (id, data) => {
      return await supabase
        .from('ventas')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .single();
    },

    // Marcar venta como alterada (para auditoría)
    marcarAlterada: async (id, motivo) => {
      return await supabase
        .from('ventas')
        .update({
          fue_alterada: true,
          motivo_alteracion: motivo,
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar venta
    delete: async (id) => {
      // Primero marcar como alterada antes de eliminar (para auditoría)
      await supabase
        .from('ventas')
        .update({
          fue_alterada: true,
          motivo_alteracion: 'Venta eliminada',
        })
        .eq('id', id);

      return await supabase
        .from('ventas')
        .delete()
        .eq('id', id);
    },

    // Obtener ventas de hoy
    getHoy: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .gte('fecha', today.toISOString())
        .lt('fecha', tomorrow.toISOString())
        .order('fecha', { ascending: false });
    },

    // Obtener ventas alteradas (auditoría)
    getAlteradas: async () => {
      return await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .eq('fue_alterada', true)
        .order('fecha', { ascending: false });
    },

    // Estadísticas de ventas
    getEstadisticas: async (startDate = null, endDate = null) => {
      let query = supabase
        .from('ventas')
        .select('total, monto, descuento, metodo_pago, fecha, vendedor_id');

      if (startDate) {
        query = query.gte('fecha', startDate);
      }
      if (endDate) {
        query = query.lte('fecha', endDate);
      }

      const { data, error } = await query;

      if (error) return { error };

      const totalVentas = data.length;
      const ventasTotales = data.reduce((sum, v) => sum + Number(v.total || v.monto || 0), 0);
      const descuentosTotales = data.reduce((sum, v) => sum + Number(v.descuento || 0), 0);
      const promedioVenta = totalVentas > 0 ? (ventasTotales / totalVentas).toFixed(2) : 0;

      // Ventas por método de pago
      const porMetodoPago = data.reduce((acc, v) => {
        const metodo = v.metodo_pago || 'Sin especificar';
        acc[metodo] = (acc[metodo] || 0) + Number(v.total || v.monto || 0);
        return acc;
      }, {});

      // Top vendedores
      const porVendedor = data.reduce((acc, v) => {
        if (v.vendedor_id) {
          acc[v.vendedor_id] = (acc[v.vendedor_id] || 0) + Number(v.total || v.monto || 0);
        }
        return acc;
      }, {});

      return {
        data: {
          totalVentas,
          ventasTotales: ventasTotales.toFixed(2),
          descuentosTotales: descuentosTotales.toFixed(2),
          ventasNetas: (ventasTotales - descuentosTotales).toFixed(2),
          promedioVenta,
          porMetodoPago,
          porVendedor,
        },
        error: null,
      };
    },

    // Obtener ticket de venta (con formato)
    getTicket: async (id) => {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          vendedor:empleados!ventas_vendedor_id_fkey(id, nombre)
        `)
        .eq('id', id)
        .single();

      if (error) return { error };

      // Parsear items del JSONB
      const items = data.items || [];

      return {
        data: {
          ...data,
          items_detalle: items,
        },
        error: null,
      };
    },
  },

  // ==================== INVENTARIO ====================
  inventario: {
    // Obtener todos los productos
    getAll: async () => {
      return await supabase
        .from('inventario')
        .select('*')
        .order('nombre');
    },

    // Obtener productos visibles en tienda (para e-commerce; sin servicios)
    getVisiblesEnTienda: async (options = {}) => {
      const res = await supabase
        .from('inventario')
        .select('*')
        .eq('visible_en_tienda', true)
        .order('nombre');
      const sucursalId = options.sucursalId || (await getClientSucursalId());
      if (!sucursalId || res.error || !Array.isArray(res.data)) return res;
      const { data: stocks, error: stErr } = await supabase
        .from('inventario_stock_sucursal')
        .select('*')
        .eq('sucursal_id', sucursalId);
      if (stErr) {
        return { ...res, data: mergeInventarioWithSucursalStock(res.data, []) };
      }
      return { ...res, data: mergeInventarioWithSucursalStock(res.data, stocks) };
    },

    /** Catálogo App Clientes: productos en tienda + servicios (Mis citas). Requiere RLS inventario_tienda_public_read. */
    getCatalogoAppClientes: async () => {
      return await supabase.from('inventario').select('*').order('nombre');
    },

    // Obtener por ID
    getById: async (id, options = {}) => {
      const res = await supabase.from('inventario').select('*').eq('id', id).single();
      const sucursalId = options.sucursalId || (await getClientSucursalId());
      if (!sucursalId || res.error || !res.data) return res;
      const { data: st } = await supabase
        .from('inventario_stock_sucursal')
        .select('stock_actual, stock_minimo')
        .eq('sucursal_id', sucursalId)
        .eq('inventario_id', id)
        .maybeSingle();
      if (st) {
        return {
          ...res,
          data: {
            ...res.data,
            stock_actual: Number(st.stock_actual ?? 0),
            stock_minimo: Number(st.stock_minimo ?? res.data.stock_minimo ?? 5),
          },
        };
      }
      return { ...res, data: { ...res.data, stock_actual: 0 } };
    },

    // Obtener por categoría
    getByCategoria: async (categoria) => {
      return await supabase
        .from('inventario')
        .select('*')
        .eq('categoria', categoria)
        .order('nombre');
    },

    // Obtener productos con stock bajo
    getStockBajo: async () => {
      return await supabase
        .from('inventario')
        .select('*')
        .filter('stock_actual', 'lte', 'stock_minimo')
        .order('stock_actual');
    },

    // Obtener productos sin stock
    getSinStock: async () => {
      return await supabase
        .from('inventario')
        .select('*')
        .eq('stock_actual', 0)
        .order('nombre');
    },

    // Buscar productos
    search: async (query) => {
      return await supabase
        .from('inventario')
        .select('*')
        .or(`nombre.ilike.%${query}%,categoria.ilike.%${query}%,barcode.ilike.%${query}%`)
        .order('nombre');
    },

    // Buscar por barcode
    getByBarcode: async (barcode) => {
      return await supabase
        .from('inventario')
        .select('*')
        .eq('barcode', barcode)
        .single();
    },

    // Crear producto
    create: async (data) => {
      return await supabase
        .from('inventario')
        .insert({
          nombre: data.nombre,
          categoria: data.categoria || null,
          stock_actual: data.stock_actual || 0,
          stock_minimo: data.stock_minimo || 5,
          precio_costo: data.precio_costo || null,
          costo: data.costo || null,
          precio_venta: data.precio_venta || null,
          es_consumible: data.es_consumible || false,
          barcode: data.barcode || null,
          imagen_url: data.imagen_url || null,
          imagenes_urls: data.imagenes_urls || [],
          fecha_vencimiento: sanitizeInventarioFechaVencimiento(data.fecha_vencimiento),
          ubicacion: data.ubicacion || null,
          notas: data.notas || null,
          visible_en_tienda: data.visible_en_tienda || false,
          descripcion_tienda: data.descripcion_tienda || null,
        })
        .select()
        .single();
    },

    // Actualizar producto
    update: async (id, data) => {
      const patch = { ...data, updated_at: new Date().toISOString() };
      if ('fecha_vencimiento' in patch) {
        patch.fecha_vencimiento = sanitizeInventarioFechaVencimiento(patch.fecha_vencimiento);
      }
      return await supabase
        .from('inventario')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
    },

    // Actualizar stock
    updateStock: async (id, nuevoStock) => {
      return await supabase
        .from('inventario')
        .update({
          stock_actual: nuevoStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Incrementar stock
    incrementarStock: async (id, cantidad) => {
      const { data: producto } = await supabase
        .from('inventario')
        .select('stock_actual')
        .eq('id', id)
        .single();

      if (!producto) return { error: 'Producto no encontrado' };

      return await supabase
        .from('inventario')
        .update({
          stock_actual: producto.stock_actual + cantidad,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Decrementar stock (catálogo global o stock por sucursal)
    decrementarStock: async (id, cantidad, options = {}) => {
      const qty = Math.max(0, Math.floor(Number(cantidad) || 0));
      const sucursalId = await resolveStockSucursalId(options.sucursal_id);

      if (sucursalId) {
        const { data: stRow, error: readErr } = await supabase
          .from('inventario_stock_sucursal')
          .select('id, stock_actual')
          .eq('sucursal_id', sucursalId)
          .eq('inventario_id', id)
          .maybeSingle();
        if (readErr && !isPostgrestSingleRowError(readErr)) return { error: readErr };
        const nuevoStock = Math.max(0, Number(stRow?.stock_actual ?? 0) - qty);
        const { error: patchErr } = await supabase
          .from('inventario_stock_sucursal')
          .upsert(
            {
              sucursal_id: sucursalId,
              inventario_id: id,
              stock_actual: nuevoStock,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'sucursal_id,inventario_id' },
          );
        if (patchErr) return { error: patchErr };
        return { data: { id, stock_actual: nuevoStock, sucursal_id: sucursalId }, error: null };
      }

      const { data: producto, error: readErr } = await supabase
        .from('inventario')
        .select('stock_actual')
        .eq('id', id)
        .maybeSingle();

      if (readErr && !isPostgrestSingleRowError(readErr)) return { error: readErr };
      if (!producto) return { error: { message: 'Producto no encontrado' } };

      const nuevoStock = Math.max(0, producto.stock_actual - qty);

      const { error: patchErr } = await supabase
        .from('inventario')
        .update({
          stock_actual: nuevoStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (patchErr) return { error: patchErr };
      return { data: { id, stock_actual: nuevoStock }, error: null };
    },

    // Cambiar visibilidad en tienda
    setVisibilidadTienda: async (id, visible) => {
      return await supabase
        .from('inventario')
        .update({
          visible_en_tienda: visible,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Eliminar producto
    delete: async (id) => {
      return await supabase
        .from('inventario')
        .delete()
        .eq('id', id);
    },

    // Obtener productos próximos a vencer
    getProximosAVencer: async (dias = 30) => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + dias);

      return await supabase
        .from('inventario')
        .select('*')
        .not('fecha_vencimiento', 'is', null)
        .lte('fecha_vencimiento', fecha.toISOString().split('T')[0])
        .order('fecha_vencimiento');
    },

    // Obtener estadísticas de inventario
    getEstadisticas: async () => {
      const { data: productos } = await supabase
        .from('inventario')
        .select('*');

      if (!productos) return { error: 'Error al obtener productos' };

      const totalProductos = productos.length;
      const productosBajoStock = productos.filter(p => 
        p.stock_actual <= p.stock_minimo
      ).length;
      const productosSinStock = productos.filter(p => p.stock_actual === 0).length;
      const productosVisiblesTienda = productos.filter(p => p.visible_en_tienda).length;
      
      const valorInventario = productos.reduce((sum, p) => {
        const costo = Number(p.costo || p.precio_costo || 0);
        return sum + (costo * p.stock_actual);
      }, 0);

      const valorVentaPotencial = productos.reduce((sum, p) => {
        const precioVenta = Number(p.precio_venta || 0);
        return sum + (precioVenta * p.stock_actual);
      }, 0);

      return {
        data: {
          totalProductos,
          productosBajoStock,
          productosSinStock,
          productosVisiblesTienda,
          valorInventario: valorInventario.toFixed(2),
          valorVentaPotencial: valorVentaPotencial.toFixed(2),
          margenPotencial: (valorVentaPotencial - valorInventario).toFixed(2),
        },
        error: null,
      };
    },

    // Obtener productos por rango de precio
    getByPrecioVenta: async (min, max) => {
      return await supabase
        .from('inventario')
        .select('*')
        .gte('precio_venta', min)
        .lte('precio_venta', max)
        .order('precio_venta');
    },
  },

  /** Ingresos de stock por lote (tabla inventario_lotes). */
  inventarioLotes: {
    getByInventarioId: async (inventarioId) => {
      return await supabase
        .from('inventario_lotes')
        .select('*')
        .eq('inventario_id', inventarioId)
        .order('fecha_ingreso', { ascending: false })
        .order('created_at', { ascending: false });
    },

    getByInventarioDateRange: async (inventarioId, fromDateIso, toDateIso) => {
      const from = String(fromDateIso || '').slice(0, 10);
      const to = String(toDateIso || '').slice(0, 10);
      return await supabase
        .from('inventario_lotes')
        .select('*')
        .eq('inventario_id', inventarioId)
        .gte('fecha_ingreso', from)
        .lte('fecha_ingreso', to)
        .order('fecha_ingreso', { ascending: false });
    },

    registrarIngreso: async ({ inventario_id, numero_lote, fecha_ingreso, cantidad, sucursal_id: sucursalIdArg }) => {
      const qty = Math.max(1, Math.floor(Number(cantidad) || 0));
      const loteNum = String(numero_lote || '').trim();
      if (!inventario_id || !loteNum) {
        return { data: null, error: { message: 'Producto y número de lote son obligatorios.' } };
      }
      const fecha = String(fecha_ingreso || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return { data: null, error: { message: 'Fecha de ingreso inválida.' } };
      }

      const { data: producto, error: pErr } = await supabase
        .from('inventario')
        .select('id, nombre, stock_actual')
        .eq('id', inventario_id)
        .single();

      if (pErr || !producto) {
        return { data: null, error: pErr || { message: 'Producto no encontrado' } };
      }

      const sucursalId = await resolveStockSucursalId(sucursalIdArg);
      let stockAntes = Math.max(0, Math.floor(Number(producto.stock_actual ?? 0)));
      let stockDespues = stockAntes + qty;

      if (sucursalId) {
        const { data: stRow, error: stErr } = await supabase
          .from('inventario_stock_sucursal')
          .select('id, stock_actual')
          .eq('sucursal_id', sucursalId)
          .eq('inventario_id', inventario_id)
          .maybeSingle();
        if (stErr) return { data: null, error: stErr };
        stockAntes = Math.max(0, Math.floor(Number(stRow?.stock_actual ?? 0)));
        stockDespues = stockAntes + qty;
      }

      const { data: lote, error: lErr } = await supabase
        .from('inventario_lotes')
        .insert({
          inventario_id,
          numero_lote: loteNum,
          fecha_ingreso: fecha,
          cantidad: qty,
          stock_antes: stockAntes,
          stock_despues: stockDespues,
          sucursal_id: sucursalId || null,
        })
        .select()
        .single();

      if (lErr) return { data: null, error: lErr };

      if (sucursalId) {
        const { error: sErr } = await supabase
          .from('inventario_stock_sucursal')
          .upsert(
            {
              sucursal_id: sucursalId,
              inventario_id,
              stock_actual: stockDespues,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'sucursal_id,inventario_id' },
          );
        if (sErr) return { data: null, error: sErr };
      } else {
        const { error: sErr } = await supabase
          .from('inventario')
          .update({
            stock_actual: stockDespues,
            updated_at: new Date().toISOString(),
          })
          .eq('id', inventario_id);
        if (sErr) return { data: null, error: sErr };
      }

      return {
        data: { lote, stockAntes, stockDespues, producto },
        error: null,
      };
    },

    /** Importa varios productos del mismo lote (p. ej. desde QR de traslado). */
    registrarIngresoBatch: async ({ sucursal_id, numero_lote, fecha_ingreso, items }) => {
      const rows = Array.isArray(items) ? items : [];
      if (!rows.length) {
        return { data: null, error: { message: 'No hay productos para importar.' } };
      }
      const results = [];
      for (const item of rows) {
        const { data, error } = await db.inventarioLotes.registrarIngreso({
          inventario_id: item.inventario_id || item.id,
          cantidad: item.cantidad ?? item.qty,
          numero_lote,
          fecha_ingreso,
          sucursal_id,
        });
        if (error) {
          return {
            data: { results, imported: results.length, total: rows.length },
            error,
          };
        }
        results.push(data);
      }
      return { data: { results, imported: results.length, total: rows.length }, error: null };
    },
  },

  // ==================== PROVEEDORES (compañías / marcas) ====================
  proveedores: {
    getAll: async () => {
      return await supabase.from('proveedores').select('*').order('nombre_compania', { ascending: true });
    },
    getById: async (id) => {
      return await supabase.from('proveedores').select('*').eq('id', id).single();
    },
    create: async (data) => {
      return await supabase
        .from('proveedores')
        .insert({
          nombre_compania: data.nombre_compania,
          logo_url: data.logo_url ?? null,
          telefono: data.telefono ?? null,
          nombre_agente: data.nombre_agente ?? null,
          telefono_agente: data.telefono_agente ?? null,
          email: data.email ?? null,
          direccion: data.direccion ?? null,
          sitio_web: data.sitio_web ?? null,
          notas: data.notas ?? null,
          nit: data.nit ?? null,
        })
        .select('*')
        .single();
    },
    update: async (id, data) => {
      return await supabase
        .from('proveedores')
        .update({
          nombre_compania: data.nombre_compania,
          logo_url: data.logo_url ?? null,
          telefono: data.telefono ?? null,
          email: data.email ?? null,
          direccion: data.direccion ?? null,
          sitio_web: data.sitio_web ?? null,
          notas: data.notas ?? null,
          nit: data.nit ?? null,
          nombre_agente: data.nombre_agente ?? null,
          telefono_agente: data.telefono_agente ?? null,
        })
        .eq('id', id)
        .select('*')
        .single();
    },
    delete: async (id) => {
      return await supabase.from('proveedores').delete().eq('id', id);
    },

    search: async (query, limit = 20) => {
      const q = String(query || '').trim();
      if (!q) return { data: [], error: null };
      return await supabase
        .from('proveedores')
        .select('*')
        .or(
          `nombre_compania.ilike.%${q}%,nit.ilike.%${q}%,nombre_agente.ilike.%${q}%,telefono.ilike.%${q}%,telefono_agente.ilike.%${q}%,email.ilike.%${q}%`,
        )
        .order('nombre_compania', { ascending: true })
        .limit(limit);
    },
  },

  // ==================== E-COMMERCE ORDERS ====================
  orders: {
    // Obtener todas las órdenes (salón: RLS staff o RPC salon_pedidos_inbox)
    getAll: async () => {
      const scope = getSalonSucursalScope();
      if (!scope.isGlobal && scope.sucursalId) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('salon_pedidos_inbox', {
          p_limit: 500,
        });
        if (!rpcError && Array.isArray(rpcData)) {
          return { data: rpcData, error: null };
        }
      }
      let q = supabase
        .from('ecommerce_orders')
        .select('*')
        .order('created_at', { ascending: false });
      q = applySalonSucursalFilter(q);
      const direct = await q;
      if (!direct.error) {
        return direct;
      }
      const { data: rpcData, error: rpcError } = await supabase.rpc('salon_pedidos_inbox', {
        p_limit: 500,
      });
      if (!rpcError && Array.isArray(rpcData)) {
        return { data: rpcData, error: null };
      }
      return direct;
    },

    // Obtener órdenes por estado
    getByStatus: async (status) => {
      let q = supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });
      q = applySalonSucursalFilter(q);
      const direct = await q;
      if (!direct.error) {
        return direct;
      }
      if (status !== 'pending') return direct;
      const { data: rpcData, error: rpcError } = await supabase.rpc('salon_pedidos_inbox', {
        p_limit: 500,
      });
      if (!rpcError && Array.isArray(rpcData)) {
        return { data: rpcData.filter((o) => String(o.status) === status), error: null };
      }
      return direct;
    },

    // Obtener orden por ID (fallback inbox RPC si RLS directo no devuelve fila)
    getById: async (id) => {
      const direct = await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (direct.data) return { data: direct.data, error: null };
      if (direct.error && !isPostgrestSingleRowError(direct.error)) {
        return { data: null, error: direct.error };
      }
      const { data: inbox, error: rpcErr } = await supabase.rpc('salon_pedidos_inbox', {
        p_limit: 1000,
      });
      if (!rpcErr && Array.isArray(inbox)) {
        const found = inbox.find((o) => String(o.id) === String(id));
        if (found) return { data: found, error: null };
      }
      return {
        data: null,
        error: {
          message:
            'Pedido no encontrado o sin permisos de salón. Ejecutá supabase-ecommerce-orders-salon.sql en Supabase.',
        },
      };
    },

    // Obtener orden por tracking code
    getByTrackingCode: async (trackingCode) => {
      return await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('tracking_code', trackingCode)
        .single();
    },

    // Obtener órdenes del cliente (todas sus compras; no filtrar por sucursal del picker)
    getByCliente: async (clientUserId, options = {}) => {
      let q = supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('client_user_id', clientUserId)
        .order('created_at', { ascending: false });
      if (options.filterSucursal === true) {
        const sid = options.sucursalId || (await getClientSucursalId());
        if (sid) q = q.eq('sucursal_id', sid);
      }
      const direct = await q;
      if (!direct.error) return direct;
      const { data: rpcData, error: rpcError } = await supabase.rpc('client_mis_pedidos', {
        p_limit: 500,
      });
      if (!rpcError && Array.isArray(rpcData)) {
        return { data: rpcData, error: null };
      }
      return direct;
    },

    // Buscar órdenes (por nombre, teléfono o tracking code)
    search: async (query) => {
      return await supabase
        .from('ecommerce_orders')
        .select('*')
        .or(`customer_name.ilike.%${query}%,customer_phone.ilike.%${query}%,tracking_code.ilike.%${query}%`)
        .order('created_at', { ascending: false });
    },

    // Crear nueva orden
    create: async (data) => {
      const clientSucursal = data.sucursal_id || (await getClientSucursalId());
      return await supabase
        .from('ecommerce_orders')
        .insert({
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          notes: data.notes || null,
          status: data.status || 'pending',
          confirmed_at:
            data.confirmed_at || (data.status === 'confirmed' ? new Date().toISOString() : null),
          total_amount: data.total_amount || 0,
          source: data.source || 'mobile-client',
          client_user_id: data.client_user_id || null,
          payment_method: data.payment_method || null,
          card_last4: data.card_last4 || null,
          fulfillment_type: data.fulfillment_type || null,
          delivery_address: data.delivery_address || null,
          delivery_reference: data.delivery_reference || null,
          checkout_snapshot: data.checkout_snapshot || null,
          sucursal_id: clientSucursal || null,
        })
        .select()
        .single();
    },

    // Actualizar orden
    update: async (id, data) => {
      const updates = {
        ...data,
        updated_at: new Date().toISOString(),
      };
      const { data: row, error } = await supabase
        .from('ecommerce_orders')
        .update(updates)
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (row) return { data: row, error: null };
      if (error && !isPostgrestSingleRowError(error)) return { data: null, error };
      const { error: patchErr } = await supabase
        .from('ecommerce_orders')
        .update(updates)
        .eq('id', id);
      if (patchErr) return { data: null, error: patchErr };
      return await supabase.from('ecommerce_orders').select('*').eq('id', id).maybeSingle();
    },

    // Actualizar estado de orden
    updateStatus: async (id, newStatus) => {
      const updates = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Actualizar timestamps según el estado
      switch (newStatus) {
        case 'confirmed':
          updates.confirmed_at = new Date().toISOString();
          break;
        case 'prepared':
          updates.prepared_at = new Date().toISOString();
          break;
        case 'delivered':
          updates.delivered_at = new Date().toISOString();
          break;
        case 'cancelled':
          updates.cancelled_at = new Date().toISOString();
          break;
      }

      return await supabase
        .from('ecommerce_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    },

    // Confirmar orden
    confirmar: async (id) => {
      return await supabase
        .from('ecommerce_orders')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Marcar como preparada
    marcarPreparada: async (id) => {
      return await supabase
        .from('ecommerce_orders')
        .update({
          status: 'prepared',
          prepared_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Marcar como entregada
    marcarEntregada: async (id) => {
      return await supabase
        .from('ecommerce_orders')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    // Cancelar orden (salón / staff con RLS update)
    cancelar: async (id, reason) => {
      return await supabase
        .from('ecommerce_orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    },

    /** Cancelar pedido propio desde App Clientes (RPC `client_cancel_pedido`). */
    cancelarPorCliente: async (orderId, reason) => {
      const { data, error } = await supabase.rpc('client_cancel_pedido', {
        p_order_id: orderId,
        p_reason: reason ?? null,
      });
      if (error) return { data: null, error };
      const row = Array.isArray(data) ? data[0] : data;
      return { data: row ?? null, error: null };
    },

    // Eliminar orden
    delete: async (id) => {
      return await supabase
        .from('ecommerce_orders')
        .delete()
        .eq('id', id);
    },

    // Obtener órdenes recientes (últimos 7 días)
    getRecientes: async (dias = 7) => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - dias);

      return await supabase
        .from('ecommerce_orders')
        .select('*')
        .gte('created_at', fecha.toISOString())
        .order('created_at', { ascending: false });
    },

    // Obtener órdenes de hoy
    getHoy: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await supabase
        .from('ecommerce_orders')
        .select('*')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .order('created_at', { ascending: false });
    },

    // Estadísticas de órdenes
    getEstadisticas: async (startDate = null, endDate = null) => {
      let query = supabase
        .from('ecommerce_orders')
        .select('status, total_amount, created_at');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) return { error };

      const totalOrdenes = data.length;
      const ordenesEntregadas = data.filter(o => o.status === 'delivered').length;
      const ordenesCanceladas = data.filter(o => o.status === 'cancelled').length;
      const ventasTotales = data
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + Number(o.total_amount), 0);
      const promedioOrden = totalOrdenes > 0 ? (ventasTotales / totalOrdenes).toFixed(2) : 0;

      return {
        data: {
          totalOrdenes,
          ordenesEntregadas,
          ordenesCanceladas,
          ventasTotales,
          promedioOrden,
          tasaEntrega: totalOrdenes > 0 ? (ordenesEntregadas / totalOrdenes * 100).toFixed(1) : 0,
        },
        error: null,
      };
    },
  },

  // ==================== METAS (OBJETIVOS) ====================
  metas: {
    getAll: async () => {
      let q = supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .order('creado_a', { ascending: false });
      q = applySalonSucursalFilter(q);
      const { data, error } = await q;
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getActivas: async () => {
      let q = supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('activo', true)
        .order('creado_a', { ascending: false });
      q = applySalonSucursalFilter(q);
      const { data, error } = await q;
      return { data, error };
    },

    getByEmpleado: async (empleadoId) => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('asignado_a', empleadoId)
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    getByTipo: async (tipo) => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('tipo', tipo)
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    getByPeriodo: async (periodo) => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('periodo', periodo)
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    getGlobales: async () => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('alcance', 'global')
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    getIndividuales: async () => {
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('alcance', 'individual')
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    search: async (query, limit = 20) => {
      const q = String(query || '').trim();
      if (!q) return { data: [], error: null };
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .or(`titulo.ilike.%${q}%,tipo.ilike.%${q}%,periodo.ilike.%${q}%,alcance.ilike.%${q}%`)
        .order('creado_a', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    create: async (data) => {
      const scope = getSalonSucursalScope();
      const row = {
        ...data,
        sucursal_id:
          data.sucursal_id ||
          (String(data.alcance || '').toLowerCase() === 'global' ? null : !scope.isGlobal ? scope.sucursalId : null) ||
          null,
      };
      const { data: nuevaMeta, error } = await supabase
        .from('metas')
        .insert([row])
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .single();
      return { data: nuevaMeta, error };
    },

    update: async (id, data) => {
      const { data: metaActualizada, error } = await supabase
        .from('metas')
        .update(data)
        .eq('id', id)
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .single();
      return { data: metaActualizada, error };
    },

    updateProgreso: async (id, nuevoActual) => {
      const { data, error } = await supabase
        .from('metas')
        .update({ actual: nuevoActual })
        .eq('id', id)
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .single();
      return { data, error };
    },

    toggleActivo: async (id) => {
      const { data: meta } = await supabase
        .from('metas')
        .select('activo')
        .eq('id', id)
        .single();

      if (!meta) return { data: null, error: { message: 'Meta no encontrada' } };

      const { data, error } = await supabase
        .from('metas')
        .update({ activo: !meta.activo })
        .eq('id', id)
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .single();
      return { data, error };
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('metas')
        .delete()
        .eq('id', id);
      return { error };
    },

    getProgreso: (meta) => {
      if (!meta || !meta.valor_objetivo || meta.valor_objetivo === 0) return 0;
      const progreso = (Number(meta.actual || 0) / Number(meta.valor_objetivo)) * 100;
      return Math.min(Math.round(progreso), 100);
    },

    calcularProgresoEmpleado: async (empleadoId) => {
      const { data: metas } = await supabase
        .from('metas')
        .select('*')
        .eq('asignado_a', empleadoId)
        .eq('activo', true);

      if (!metas || metas.length === 0) {
        return { data: { progresoPromedio: 0, metasActivas: 0, metasCompletadas: 0 }, error: null };
      }

      let totalProgreso = 0;
      let metasCompletadas = 0;

      metas.forEach(meta => {
        const progreso = db.metas.getProgreso(meta);
        totalProgreso += progreso;
        if (progreso >= 100) metasCompletadas++;
      });

      return {
        data: {
          progresoPromedio: Math.round(totalProgreso / metas.length),
          metasActivas: metas.length,
          metasCompletadas,
        },
        error: null,
      };
    },

    getMetasVencidas: async () => {
      const hoy = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('activo', true)
        .lt('fecha_fin', hoy)
        .order('fecha_fin', { ascending: true });
      return { data, error };
    },

    getMetasProximasAVencer: async (dias = 7) => {
      const hoy = new Date();
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + dias);

      const hoyISO = hoy.toISOString().split('T')[0];
      const futuroISO = futuro.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('metas')
        .select('*, asignado_a:empleados(id, nombre, rol)')
        .eq('activo', true)
        .gte('fecha_fin', hoyISO)
        .lte('fecha_fin', futuroISO)
        .order('fecha_fin', { ascending: true });
      return { data, error };
    },

    getEstadisticas: async () => {
      const { data: todasLasMetas } = await supabase
        .from('metas')
        .select('*');

      const metasActivas = todasLasMetas?.filter(m => m.activo) || [];
      const metasGlobales = metasActivas.filter(m => m.alcance === 'global');
      const metasIndividuales = metasActivas.filter(m => m.alcance === 'individual');

      let metasCompletadas = 0;
      let progresoPromedio = 0;

      metasActivas.forEach(meta => {
        const progreso = db.metas.getProgreso(meta);
        progresoPromedio += progreso;
        if (progreso >= 100) metasCompletadas++;
      });

      return {
        data: {
          totalMetas: todasLasMetas?.length || 0,
          metasActivas: metasActivas.length,
          metasGlobales: metasGlobales.length,
          metasIndividuales: metasIndividuales.length,
          metasCompletadas,
          progresoPromedio: metasActivas.length > 0 ? Math.round(progresoPromedio / metasActivas.length) : 0,
        },
        error: null,
      };
    },

    /** Meta global única: monto en ventas Q (salón + app clientes). */
    getGlobalMontoActiva: async () => {
      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('alcance', 'global')
        .eq('tipo', 'monto_ventas')
        .eq('activo', true)
        .order('creado_a', { ascending: false })
        .limit(1)
        .maybeSingle();
      return { data, error };
    },

    setMetaGlobalUnica: async ({
      valor_objetivo,
      titulo = 'Meta global de ventas',
      fecha_inicio = null,
      fecha_fin = null,
    }) => {
      const v = Number(valor_objetivo);
      if (!Number.isFinite(v) || v <= 0) {
        return { data: null, error: { message: 'El objetivo debe ser un monto mayor a 0.' } };
      }
      if (fecha_inicio && fecha_fin) {
        const ini = new Date(fecha_inicio);
        const fin = new Date(fecha_fin);
        if (ini > fin) {
          return { data: null, error: { message: 'La fecha de inicio no puede ser posterior al fin.' } };
        }
      }

      await supabase.from('metas').update({ activo: false }).eq('alcance', 'global');

      const { data: existing } = await supabase
        .from('metas')
        .select('*')
        .eq('alcance', 'global')
        .eq('tipo', 'monto_ventas')
        .order('creado_a', { ascending: false })
        .limit(1)
        .maybeSingle();

      const periodo = new Date().toISOString().slice(0, 7);
      const payload = {
        titulo,
        valor_objetivo: v,
        activo: true,
        periodo,
        alcance: 'global',
        tipo: 'monto_ventas',
        asignado_a: null,
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null,
      };

      if (existing) {
        return await db.metas.update(existing.id, payload);
      }

      return await db.metas.create({
        ...payload,
        actual: 0,
      });
    },

    incrementarMonto: async (id, monto) => {
      const delta = Number(monto);
      if (!Number.isFinite(delta) || delta <= 0) return { data: null, error: null };
      const { data: meta, error: e0 } = await db.metas.getById(id);
      if (e0 || !meta) return { data: null, error: e0 || { message: 'Meta no encontrada' } };
      const nuevo = Number(meta.actual || 0) + delta;
      return db.metas.updateProgreso(id, nuevo);
    },

    reiniciarProgresoGlobal: async () => {
      const { data } = await db.metas.getGlobalMontoActiva();
      if (!data) return { data: null, error: { message: 'No hay meta global activa.' } };
      return db.metas.updateProgreso(data.id, 0);
    },
  },
  marketingPosts: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getPublished: async () => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      return { data, error };
    },

    getDrafts: async () => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', 'draft')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByStatus: async (status) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByVisibility: async (visibility) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('visibility', visibility)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByContentType: async (contentType) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('content_type', contentType)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByAudience: async (audience) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('audience', audience)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByAuthor: async (authorId) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getRecent: async (limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getWithMedia: async () => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    /** Posts publicados con multimedia para el feed Tendencias (App Clientes). */
    getPublishedTendenciasFeed: async (limit = 30) => {
      const filterMedia = (r) => {
        const url = r.media_url;
        if (!url || typeof url !== 'string') return false;
        const ct = String(r.content_type || '').toLowerCase();
        if (ct === 'video' || ct === 'image') return true;
        return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url) || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
      };

      const { data: rankSource } = await supabase
        .from('marketing_posts')
        .select('id, audience, status, published_at, created_at, media_url, content_type')
        .eq('status', 'published');

      const rankRows = (rankSource || []).filter(isTendenciasFeedPost);

      const { data: rpcData, error: rpcError } = await supabase.rpc('feed_tendencias', {
        p_limit: limit,
      });
      if (!rpcError && Array.isArray(rpcData)) {
        const filtered = rpcData.filter((r) => {
          // Excluir siempre contenido de carrusel e hero de Inicio
          const aud = String(r?.audience || '');
          if (aud === 'home_carousel' || aud === 'home_hero') return false;
          return filterMedia(r);
        });
        return { data: enrichTendenciasFeedPosts(filtered, rankRows), error: null };
      }
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);
      if (error) return { data: [], error };
      const list = data || [];
      const filtered = list.filter((r) => {
        const aud = String(r?.audience || '');
        if (aud === 'home_carousel' || aud === 'home_hero') return false;
        return filterMedia(r);
      });
      return { data: enrichTendenciasFeedPosts(filtered, rankRows), error: null };
    },

    /** Carrusel hero «Reserva tu cita» (parte superior Inicio App Clientes). */
    getPublishedHomeHero: async (limit = 15) => {
      const { data: rpcData, error: rpcError } = await supabase.rpc('feed_home_hero', {
        p_limit: limit,
      });
      if (!rpcError && Array.isArray(rpcData)) {
        const list = (rpcData || []).filter((r) => {
          const url = r.media_url;
          if (!url || typeof url !== 'string') return false;
          const ct = String(r.content_type || '').toLowerCase();
          if (ct === 'image') return true;
          return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
        });
        return { data: list, error: null };
      }
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', 'published')
        .eq('audience', 'home_hero')
        .not('media_url', 'is', null)
        .order('published_at', { ascending: false })
        .limit(limit);
      if (error) return { data: [], error };
      const list = (data || []).filter((r) => {
        const url = r.media_url;
        if (!url || typeof url !== 'string') return false;
        const ct = String(r.content_type || '').toLowerCase();
        if (ct === 'image') return true;
        return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
      });
      return { data: list, error: null };
    },

    /** Carrusel «Publicidad» bajo Pedidos en App Clientes (misma tabla, audience = home_carousel). */
    getPublishedHomeCarousel: async (limit = 15) => {
      const { data: rpcData, error: rpcError } = await supabase.rpc('feed_home_carousel', {
        p_limit: limit,
      });
      if (!rpcError && Array.isArray(rpcData)) {
        const list = (rpcData || []).filter((r) => {
          const url = r.media_url;
          if (!url || typeof url !== 'string') return false;
          const ct = String(r.content_type || '').toLowerCase();
          if (ct === 'image') return true;
          return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
        });
        return { data: list, error: null };
      }
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', 'published')
        .eq('audience', 'home_carousel')
        .not('media_url', 'is', null)
        .order('published_at', { ascending: false })
        .limit(limit);
      if (error) return { data: [], error };
      const list = (data || []).filter((r) => {
        const url = r.media_url;
        if (!url || typeof url !== 'string') return false;
        const ct = String(r.content_type || '').toLowerCase();
        if (ct === 'image') return true;
        return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
      });
      return { data: list, error: null };
    },

    search: async (query) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .or(`title.ilike.%${query}%,body.ilike.%${query}%,author_name.ilike.%${query}%`)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    create: async (data) => {
      const postData = {
        ...data,
        created_at: new Date().toISOString(),
      };

      if (data.status === 'published' && !data.published_at) {
        postData.published_at = new Date().toISOString();
      }

      const { data: newPost, error } = await supabase
        .from('marketing_posts')
        .insert([postData])
        .select()
        .single();
      return { data: newPost, error };
    },

    update: async (id, data) => {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedPost, error } = await supabase
        .from('marketing_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      return { data: updatedPost, error };
    },

    publish: async (id) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    unpublish: async (id) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .update({
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    archive: async (id) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('marketing_posts')
        .delete()
        .eq('id', id);
      return { error };
    },

    incrementViews: async (id) => {
      const { data: post } = await supabase
        .from('marketing_posts')
        .select('views_count')
        .eq('id', id)
        .single();

      if (!post) return { data: null, error: { message: 'Post no encontrado' } };

      const { data, error } = await supabase
        .from('marketing_posts')
        .update({ views_count: (post.views_count || 0) + 1 })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    incrementReactions: async (id) => {
      const { data: post } = await supabase
        .from('marketing_posts')
        .select('reactions_count')
        .eq('id', id)
        .single();

      if (!post) return { data: null, error: { message: 'Post no encontrado' } };

      const { data, error } = await supabase
        .from('marketing_posts')
        .update({ reactions_count: (post.reactions_count || 0) + 1 })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    decrementReactions: async (id) => {
      const { data: post } = await supabase
        .from('marketing_posts')
        .select('reactions_count')
        .eq('id', id)
        .single();

      if (!post) return { data: null, error: { message: 'Post no encontrado' } };

      const newCount = Math.max(0, (post.reactions_count || 0) - 1);

      const { data, error } = await supabase
        .from('marketing_posts')
        .update({ reactions_count: newCount })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    getMostViewed: async (limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', 'published')
        .order('views_count', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getMostReacted: async (limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('status', 'published')
        .order('reactions_count', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getEstadisticas: async () => {
      const { data: allPosts } = await supabase
        .from('marketing_posts')
        .select('*');

      const published = allPosts?.filter(p => p.status === 'published') || [];
      const drafts = allPosts?.filter(p => p.status === 'draft') || [];
      const archived = allPosts?.filter(p => p.status === 'archived') || [];

      const totalViews = allPosts?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
      const totalReactions = allPosts?.reduce((sum, p) => sum + (p.reactions_count || 0), 0) || 0;

      const withMedia = allPosts?.filter(p => p.media_url) || [];

      return {
        data: {
          totalPosts: allPosts?.length || 0,
          published: published.length,
          drafts: drafts.length,
          archived: archived.length,
          totalViews,
          totalReactions,
          withMedia: withMedia.length,
          avgViewsPerPost: allPosts?.length > 0 ? Math.round(totalViews / allPosts.length) : 0,
          avgReactionsPerPost: allPosts?.length > 0 ? Math.round(totalReactions / allPosts.length) : 0,
        },
        error: null,
      };
    },

    getByDateRange: async (startDate, endDate) => {
      const { data, error } = await supabase
        .from('marketing_posts')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });
      return { data, error };
    },
  },

  // ==================== MARKETING POST LIKES ====================
  marketingPostLikes: {
    getLikesByPost: async (postId) => {
      const { data, error } = await supabase
        .from('marketing_post_likes')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getLikesCount: async (postId) => {
      const { count, error } = await supabase
        .from('marketing_post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      return { data: count || 0, error };
    },

    hasLiked: async (postId, clientKey) => {
      const { data, error } = await supabase
        .from('marketing_post_likes')
        .select('*')
        .eq('post_id', postId)
        .eq('client_key', clientKey)
        .maybeSingle();
      return { data: !!data, error };
    },

    addLike: async (postId, clientKey) => {
      const { data, error } = await supabase
        .from('marketing_post_likes')
        .insert([{ post_id: postId, client_key: clientKey }])
        .select()
        .single();

      if (!error) {
        await db.marketingPosts.incrementReactions(postId);
      }

      return { data, error };
    },

    removeLike: async (postId, clientKey) => {
      const { error } = await supabase
        .from('marketing_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('client_key', clientKey);

      if (!error) {
        await db.marketingPosts.decrementReactions(postId);
      }

      return { error };
    },

    toggleLike: async (postId, clientKey) => {
      const { data: hasLiked } = await db.marketingPostLikes.hasLiked(postId, clientKey);

      if (hasLiked) {
        const { error } = await db.marketingPostLikes.removeLike(postId, clientKey);
        return { data: { liked: false }, error };
      } else {
        const { data, error } = await db.marketingPostLikes.addLike(postId, clientKey);
        return { data: { liked: true, like: data }, error };
      }
    },

    getPostsLikedByClient: async (clientKey) => {
      const { data, error } = await supabase
        .from('marketing_post_likes')
        .select('post_id, created_at, marketing_posts(*)')
        .eq('client_key', clientKey)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getLikesWithPagination: async (postId, offset = 0, limit = 20) => {
      const { data, error } = await supabase
        .from('marketing_post_likes')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return { data, error };
    },

    deleteAllByPost: async (postId) => {
      const { error } = await supabase
        .from('marketing_post_likes')
        .delete()
        .eq('post_id', postId);
      return { error };
    },

    getTopLikedPosts: async (limit = 10, startDate = null, endDate = null) => {
      let query = supabase
        .from('marketing_post_likes')
        .select('post_id, marketing_posts(*)');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) return { data: null, error };

      const likesCount = {};
      data?.forEach(like => {
        if (like.post_id) {
          likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
        }
      });

      const topPosts = Object.entries(likesCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([postId, count]) => ({
          post_id: postId,
          likes_count: count,
          post: data.find(d => d.post_id === parseInt(postId))?.marketing_posts,
        }));

      return { data: topPosts, error: null };
    },

    getRecentLikes: async (postId, limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_post_likes')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getEstadisticas: async () => {
      const { data: allLikes } = await supabase
        .from('marketing_post_likes')
        .select('*');

      const uniquePosts = new Set(allLikes?.map(like => like.post_id) || []);
      const uniqueClients = new Set(allLikes?.map(like => like.client_key) || []);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const likesToday = allLikes?.filter(like => 
        new Date(like.created_at) >= today
      ) || [];

      return {
        data: {
          totalLikes: allLikes?.length || 0,
          postsConLikes: uniquePosts.size,
          clientesActivos: uniqueClients.size,
          likesHoy: likesToday.length,
          promedioLikesPorPost: uniquePosts.size > 0 
            ? Math.round((allLikes?.length || 0) / uniquePosts.size) 
            : 0,
        },
        error: null,
      };
    },
  },

  // ==================== MARKETING DIRECT MESSAGES ====================
  marketingDirectMessages: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getByStatus: async (status) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('status', status)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getPendingSync: async () => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('status', 'pending_sync')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getDelivered: async () => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false });
      return { data, error };
    },

    getByClient: async (clientId, options = {}) => {
      const select = options.forClientApp
        ? '*'
        : '*, cliente:clientes(id, nombre, telefono, email)';
      let q = supabase
        .from('marketing_direct_messages')
        .select(select)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (options.limit) q = q.limit(options.limit);
      const { data, error } = await q;
      // Con límite: llegan los N más recientes en DESC → revertir a cronológico ASC
      const result = options.limit && Array.isArray(data) ? [...data].reverse() : data;
      return { data: result, error };
    },

    getByCreator: async (creatorId) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('created_by', creatorId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByContentType: async (contentType) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('content_type', contentType)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getWithMedia: async () => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    search: async (query) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .or(`content.ilike.%${query}%,client_name.ilike.%${query}%,client_phone.ilike.%${query}%`)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    /** Interés carrusel / Tendencias desde App Clientes → bandeja Pedidos (salón). */
    listPedidosInterest: async (limit = 400) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .in('content_type', ['carousel_interest', 'tendencias_interest'])
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    create: async (data, options = {}) => {
      const messageData = {
        ...data,
        created_at: data.created_at || new Date().toISOString(),
      };

      const selectCols = options.forClientApp
        ? 'id, client_id, client_name, client_phone, content, content_type, status, created_at, media_url, media_kind, created_by, created_by_name, delivered_at'
        : '*, cliente:clientes(id, nombre, telefono, email)';

      const { data: row, error } = await supabase
        .from('marketing_direct_messages')
        .insert([messageData])
        .select(selectCols)
        .maybeSingle();

      if (row) return { data: row, error: null };
      if (error && !isPostgrestSingleRowError(error)) return { data: null, error };
      return {
        data: null,
        error: error || { message: 'Mensaje guardado pero no se pudo leer la respuesta. Recargá el chat.' },
      };
    },

    createBulk: async (messages) => {
      const messagesData = messages.map((msg) => ({
        ...msg,
        created_at: msg.created_at || new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .insert(messagesData)
        .select('id, client_id, content, content_type, status, created_at, media_url, media_kind, created_by, created_by_name');

      return { data, error };
    },

    update: async (id, data) => {
      const { data: updatedMessage, error } = await supabase
        .from('marketing_direct_messages')
        .update(data)
        .eq('id', id)
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .single();
      return { data: updatedMessage, error };
    },

    markAsDelivered: async (id) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .single();
      return { data, error };
    },

    markAsFailed: async (id) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .update({ status: 'failed' })
        .eq('id', id)
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .single();
      return { data, error };
    },

    markBulkAsDelivered: async (ids) => {
      const deliveredAt = new Date().toISOString();
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .update({
          status: 'delivered',
          delivered_at: deliveredAt,
        })
        .in('id', ids)
        .select('*, cliente:clientes(id, nombre, telefono, email)');
      return { data, error };
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('marketing_direct_messages')
        .delete()
        .eq('id', id);
      return { error };
    },

    deleteByClient: async (clientId) => {
      const { error } = await supabase
        .from('marketing_direct_messages')
        .delete()
        .eq('client_id', clientId);
      return { error };
    },

    getRecent: async (limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getRecentForInbox: async (limit = 300) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    /** Último mensaje Andreas Pro por cliente (orden bandeja tipo WhatsApp). */
    getInboxPreviewsByClient: async () => {
      const { data, error } = await supabase.rpc('salon_inbox_client_preview');
      if (!error) return { data: data || [], error: null };
      const { data: fallback, error: fbErr } = await supabase
        .from('marketing_direct_messages')
        .select('client_id, content, created_at, content_type, status')
        .in('content_type', [
          'chat',
          'broadcast_promo',
          'incident_report',
          'cita_confirmacion',
          'tendencias_interest',
          'carousel_interest',
        ])
        .order('created_at', { ascending: false })
        .limit(5000);
      if (fbErr) return { data: [], error: fbErr };
      const lastBy = new Map();
      for (const m of fallback || []) {
        if (!m?.client_id) continue;
        const prev = lastBy.get(m.client_id);
        if (!prev || new Date(m.created_at) > new Date(prev.created_at)) lastBy.set(m.client_id, m);
      }
      return { data: Array.from(lastBy.values()), error: null };
    },

    getByDateRange: async (startDate, endDate) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getDeliveredInRange: async (startDate, endDate) => {
      const { data, error } = await supabase
        .from('marketing_direct_messages')
        .select('*, cliente:clientes(id, nombre, telefono, email)')
        .eq('status', 'delivered')
        .gte('delivered_at', startDate)
        .lte('delivered_at', endDate)
        .order('delivered_at', { ascending: false });
      return { data, error };
    },

    getEstadisticas: async () => {
      const { data: allMessages } = await supabase
        .from('marketing_direct_messages')
        .select('*');

      const pending = allMessages?.filter(m => m.status === 'pending_sync') || [];
      const delivered = allMessages?.filter(m => m.status === 'delivered') || [];
      const failed = allMessages?.filter(m => m.status === 'failed') || [];

      const uniqueClients = new Set(allMessages?.map(m => m.client_id).filter(Boolean) || []);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const messagesHoy = allMessages?.filter(m => 
        new Date(m.created_at) >= today
      ) || [];

      const deliveredHoy = delivered.filter(m => 
        m.delivered_at && new Date(m.delivered_at) >= today
      );

      const withMedia = allMessages?.filter(m => m.media_url) || [];

      return {
        data: {
          totalMensajes: allMessages?.length || 0,
          pending: pending.length,
          delivered: delivered.length,
          failed: failed.length,
          clientesUnicos: uniqueClients.size,
          mensajesHoy: messagesHoy.length,
          entregadosHoy: deliveredHoy.length,
          conMedia: withMedia.length,
          tasaEntrega: allMessages?.length > 0 
            ? Math.round((delivered.length / allMessages.length) * 100) 
            : 0,
        },
        error: null,
      };
    },

    getCampaignStats: async (startDate, endDate, creatorId = null) => {
      let query = supabase
        .from('marketing_direct_messages')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (creatorId) {
        query = query.eq('created_by', creatorId);
      }

      const { data: messages } = await query;

      const delivered = messages?.filter(m => m.status === 'delivered') || [];
      const failed = messages?.filter(m => m.status === 'failed') || [];
      const pending = messages?.filter(m => m.status === 'pending_sync') || [];
      const uniqueClients = new Set(messages?.map(m => m.client_id).filter(Boolean) || []);

      return {
        data: {
          totalEnviados: messages?.length || 0,
          entregados: delivered.length,
          fallidos: failed.length,
          pendientes: pending.length,
          clientesAlcanzados: uniqueClients.size,
          tasaExito: messages?.length > 0 
            ? Math.round((delivered.length / messages.length) * 100) 
            : 0,
        },
        error: null,
      };
    },
  },

  // ==================== MARKETING COMMENTS ====================
  marketingComments: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getByPost: async (postId) => {
      const { data: rpcData, error: rpcError } = await supabase.rpc('list_marketing_comments', {
        p_post_id: postId,
      });
      if (!rpcError && Array.isArray(rpcData)) {
        return { data: rpcData, error: null };
      }
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByAuthor: async (authorId) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getByModerationStatus: async (status) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('moderation_status', status)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getVisible: async () => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('moderation_status', 'visible')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getVisibleByPost: async (postId) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('moderation_status', 'visible')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getPendingModeration: async () => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('moderation_status', 'pending')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getHidden: async () => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('moderation_status', 'hidden')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    countByPost: async (postId) => {
      const { count, error } = await supabase
        .from('marketing_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('moderation_status', 'visible');
      return { data: count || 0, error };
    },

    create: async (data) => {
      const { data: rpcRow, error: rpcError } = await supabase.rpc('create_marketing_comment', {
        p_post_id: data.post_id,
        p_content: data.content,
        p_author_name: data.author_name || 'Cliente',
      });
      if (!rpcError && rpcRow) {
        return { data: rpcRow, error: null };
      }
      const commentData = {
        ...data,
        created_at: new Date().toISOString(),
      };

      const { data: newComment, error } = await supabase
        .from('marketing_comments')
        .insert([commentData])
        .select()
        .single();
      return { data: newComment, error: rpcError || error };
    },

    update: async (id, data) => {
      const { data: updatedComment, error } = await supabase
        .from('marketing_comments')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      return { data: updatedComment, error };
    },

    moderate: async (id, status) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .update({ moderation_status: status })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    approve: async (id) => {
      return await db.marketingComments.moderate(id, 'visible');
    },

    hide: async (id) => {
      return await db.marketingComments.moderate(id, 'hidden');
    },

    markPending: async (id) => {
      return await db.marketingComments.moderate(id, 'pending');
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('marketing_comments')
        .delete()
        .eq('id', id);
      return { error };
    },

    deleteByPost: async (postId) => {
      const { error } = await supabase
        .from('marketing_comments')
        .delete()
        .eq('post_id', postId);
      return { error };
    },

    deleteByAuthor: async (authorId) => {
      const { error } = await supabase
        .from('marketing_comments')
        .delete()
        .eq('author_id', authorId);
      return { error };
    },

    getRecent: async (limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    /** Comentarios con post asociado — bandeja Pedidos (App Salón). */
    listForPedidosInbox: async (limit = 400) => {
      return await supabase
        .from('marketing_comments')
        .select('*, marketing_posts(id, title, audience, media_url, content_type)')
        .order('created_at', { ascending: false })
        .limit(limit);
    },

    getRecentByPost: async (postId, limit = 10) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('moderation_status', 'visible')
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getWithPagination: async (offset = 0, limit = 20) => {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return { data, error };
    },

    getEstadisticas: async () => {
      const { data: allComments } = await supabase
        .from('marketing_comments')
        .select('*');

      const visible = allComments?.filter(c => c.moderation_status === 'visible') || [];
      const hidden = allComments?.filter(c => c.moderation_status === 'hidden') || [];
      const pending = allComments?.filter(c => c.moderation_status === 'pending') || [];

      const uniquePosts = new Set(allComments?.map(c => c.post_id) || []);
      const uniqueAuthors = new Set(allComments?.map(c => c.author_id).filter(Boolean) || []);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const commentsHoy = allComments?.filter(c => 
        new Date(c.created_at) >= today
      ) || [];

      return {
        data: {
          totalComentarios: allComments?.length || 0,
          visible: visible.length,
          hidden: hidden.length,
          pending: pending.length,
          postsConComentarios: uniquePosts.size,
          autoresUnicos: uniqueAuthors.size,
          comentariosHoy: commentsHoy.length,
          promedioComentariosPorPost: uniquePosts.size > 0 
            ? Math.round((allComments?.length || 0) / uniquePosts.size) 
            : 0,
        },
        error: null,
      };
    },

    getTopCommentedPosts: async (limit = 10) => {
      const { data: allComments } = await supabase
        .from('marketing_comments')
        .select('post_id, marketing_posts(*)');

      if (!allComments) return { data: [], error: null };

      const commentsCount = {};
      allComments.forEach(comment => {
        if (comment.post_id) {
          commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1;
        }
      });

      const topPosts = Object.entries(commentsCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([postId, count]) => ({
          post_id: postId,
          comments_count: count,
          post: allComments.find(c => c.post_id === parseInt(postId))?.marketing_posts,
        }));

      return { data: topPosts, error: null };
    },
  },

  // ==================== CAJAS ====================
  cajas: {
    getAll: async () => {
      let q = supabase.from('cajas').select('*').order('creado_a', { ascending: false });
      q = applySalonSucursalFilter(q);
      const { data, error } = await q;
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('cajas')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getAbiertas: async () => {
      let q = supabase.from('cajas').select('*').eq('estado', 'abierta').order('fecha_apertura', { ascending: false });
      q = applySalonSucursalFilter(q);
      const { data, error } = await q;
      return { data, error };
    },

    getCerradas: async () => {
      const { data, error } = await supabase
        .from('cajas')
        .select('*')
        .eq('estado', 'cerrada')
        .order('fecha_cierre', { ascending: false });
      return { data, error };
    },

    getCajaActual: async () => {
      let q = supabase
        .from('cajas')
        .select('*')
        .eq('estado', 'abierta')
        .order('fecha_apertura', { ascending: false })
        .limit(1);
      q = applySalonSucursalFilter(q);
      const { data, error } = await q.maybeSingle();
      return { data, error };
    },

    getByResponsable: async (responsable) => {
      const { data, error } = await supabase
        .from('cajas')
        .select('*')
        .eq('responsable', responsable)
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    getByFecha: async (fecha) => {
      const { data, error } = await supabase
        .from('cajas')
        .select('*')
        .eq('fecha_apertura', fecha)
        .order('creado_a', { ascending: false });
      return { data, error };
    },

    getHoy: async () => {
      const today = localCalendarDateString();
      return await db.cajas.getByFecha(today);
    },

    search: async (query, limit = 15) => {
      const q = String(query || '').trim();
      if (!q) return { data: [], error: null };
      const { data, error } = await supabase
        .from('cajas')
        .select('*')
        .or(
          `responsable.ilike.%${q}%,responsable_apertura.ilike.%${q}%,responsable_cierre.ilike.%${q}%,estado.ilike.%${q}%`,
        )
        .order('creado_a', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getByDateRange: async (startDate, endDate) => {
      const { data, error } = await supabase
        .from('cajas')
        .select('*')
        .gte('fecha_apertura', startDate)
        .lte('fecha_apertura', endDate)
        .order('fecha_apertura', { ascending: false });
      return { data, error };
    },

    abrir: async (data) => {
      const scope = getSalonSucursalScope();
      const sucursalId = data.sucursal_id || (!scope.isGlobal ? scope.sucursalId : null) || null;
      if (!scope.isGlobal && !sucursalId) {
        return {
          data: null,
          error: {
            message:
              'Tu perfil admin_sucursal debe tener sucursal_id en profiles. Cerrá sesión y volvé a entrar, o pedí a matriz que revise tu cuenta.',
          },
        };
      }
      const cajaData = {
        monto_apertura: data.monto_apertura,
        responsable: data.responsable,
        responsable_apertura: data.responsable_apertura || data.responsable,
        estado: 'abierta',
        fecha_apertura: localCalendarDateString(),
        creado_a: new Date().toISOString(),
        sucursal_id: sucursalId,
      };

      const { data: newCaja, error } = await supabase
        .from('cajas')
        .insert([cajaData])
        .select()
        .single();
      return { data: newCaja, error };
    },

    cerrar: async (id, data) => {
      const cierreData = {
        monto_cierre: data.monto_cierre,
        responsable_cierre: data.responsable_cierre,
        fecha_cierre: new Date().toISOString(),
        estado: 'cerrada',
      };

      const { data: cajaCerrada, error } = await supabase
        .from('cajas')
        .update(cierreData)
        .eq('id', id)
        .select()
        .single();
      return { data: cajaCerrada, error };
    },

    update: async (id, data) => {
      const { data: updatedCaja, error } = await supabase
        .from('cajas')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      return { data: updatedCaja, error };
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('cajas')
        .delete()
        .eq('id', id);
      return { error };
    },

    getMovimientos: async (cajaId) => {
      const { data, error } = await supabase
        .from('movimientos_caja')
        .select('*')
        .eq('caja_id', cajaId)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getVentas: async (cajaId) => {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .eq('caja_id', cajaId)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getDevoluciones: async (cajaId) => {
      const { data, error } = await supabase
        .from('devoluciones')
        .select('*')
        .eq('caja_id', cajaId)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getCambios: async (cajaId) => {
      const { data, error } = await supabase
        .from('cambios_productos')
        .select('*')
        .eq('caja_id', cajaId)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    calcularCuadre: async (cajaId) => {
      const { data: caja } = await supabase
        .from('cajas')
        .select('*')
        .eq('id', cajaId)
        .single();

      if (!caja) return { data: null, error: { message: 'Caja no encontrada' } };

      const { data: ventas } = await supabase
        .from('ventas')
        .select('total')
        .eq('caja_id', cajaId);

      const { data: movimientos } = await supabase
        .from('movimientos_caja')
        .select('tipo, monto')
        .eq('caja_id', cajaId);

      const { data: devoluciones } = await supabase
        .from('devoluciones')
        .select('monto_devuelto')
        .eq('caja_id', cajaId);

      const { data: cambios } = await supabase
        .from('cambios_productos')
        .select('diferencia_cobrada')
        .eq('caja_id', cajaId);

      const totalVentas = ventas?.reduce((sum, v) => sum + Number(v.total || 0), 0) || 0;
      const totalDevoluciones = devoluciones?.reduce((sum, d) => sum + Number(d.monto_devuelto || 0), 0) || 0;
      const totalDiferenciasCambios = cambios?.reduce((sum, c) => sum + Number(c.diferencia_cobrada || 0), 0) || 0;

      let totalEntradas = 0;
      let totalSalidas = 0;

      movimientos?.forEach(m => {
        const monto = Number(m.monto || 0);
        if (m.tipo === 'entrada') {
          totalEntradas += monto;
        } else if (m.tipo === 'salida') {
          totalSalidas += monto;
        }
      });

      const montoApertura = Number(caja.monto_apertura || 0);
      const montoCierreEsperado = montoApertura + totalVentas + totalDiferenciasCambios + totalEntradas - totalDevoluciones - totalSalidas;
      const montoCierreReal = caja.monto_cierre ? Number(caja.monto_cierre) : null;
      const diferencia = montoCierreReal !== null ? (montoCierreReal - montoCierreEsperado) : null;

      return {
        data: {
          caja_id: cajaId,
          monto_apertura: montoApertura.toFixed(2),
          total_ventas: totalVentas.toFixed(2),
          total_devoluciones: totalDevoluciones.toFixed(2),
          total_diferencias_cambios: totalDiferenciasCambios.toFixed(2),
          total_entradas: totalEntradas.toFixed(2),
          total_salidas: totalSalidas.toFixed(2),
          monto_cierre_esperado: montoCierreEsperado.toFixed(2),
          monto_cierre_real: montoCierreReal !== null ? montoCierreReal.toFixed(2) : null,
          diferencia: diferencia !== null ? diferencia.toFixed(2) : null,
          estado_cuadre: diferencia === null ? 'pendiente' : (Math.abs(diferencia) < 0.01 ? 'correcto' : (diferencia > 0 ? 'sobrante' : 'faltante')),
        },
        error: null,
      };
    },

    getEstadisticas: async () => {
      const { data: allCajas } = await supabase
        .from('cajas')
        .select('*');

      const abiertas = allCajas?.filter(c => c.estado === 'abierta') || [];
      const cerradas = allCajas?.filter(c => c.estado === 'cerrada') || [];

      const totalAperturas = allCajas?.reduce((sum, c) => sum + Number(c.monto_apertura || 0), 0) || 0;
      const totalCierres = cerradas.reduce((sum, c) => sum + Number(c.monto_cierre || 0), 0) || 0;

      const todayStr = localCalendarDateString();

      const cajasHoy = allCajas?.filter(c =>
        c.fecha_apertura === todayStr
      ) || [];

      const promedioApertura = allCajas?.length > 0
        ? (totalAperturas / allCajas.length)
        : 0;

      const promedioCierre = cerradas.length > 0
        ? (totalCierres / cerradas.length)
        : 0;

      return {
        data: {
          totalCajas: allCajas?.length || 0,
          cajasAbiertas: abiertas.length,
          cajasCerradas: cerradas.length,
          cajasHoy: cajasHoy.length,
          totalAperturas: totalAperturas.toFixed(2),
          totalCierres: totalCierres.toFixed(2),
          promedioApertura: promedioApertura.toFixed(2),
          promedioCierre: promedioCierre.toFixed(2),
        },
        error: null,
      };
    },

    getEstadisticasPorResponsable: async () => {
      const { data: allCajas } = await supabase
        .from('cajas')
        .select('*');

      if (!allCajas) return { data: [], error: null };

      const responsablesStats = {};
      allCajas.forEach(caja => {
        const responsable = caja.responsable || 'Sin especificar';
        if (!responsablesStats[responsable]) {
          responsablesStats[responsable] = {
            responsable,
            totalCajas: 0,
            totalApertura: 0,
            totalCierre: 0,
            cajasAbiertas: 0,
            cajasCerradas: 0,
          };
        }
        responsablesStats[responsable].totalCajas++;
        responsablesStats[responsable].totalApertura += Number(caja.monto_apertura || 0);
        
        if (caja.estado === 'abierta') {
          responsablesStats[responsable].cajasAbiertas++;
        } else if (caja.estado === 'cerrada') {
          responsablesStats[responsable].cajasCerradas++;
          responsablesStats[responsable].totalCierre += Number(caja.monto_cierre || 0);
        }
      });

      const stats = Object.values(responsablesStats)
        .sort((a, b) => b.totalCajas - a.totalCajas)
        .map(s => ({
          ...s,
          totalApertura: s.totalApertura.toFixed(2),
          totalCierre: s.totalCierre.toFixed(2),
        }));

      return { data: stats, error: null };
    },
  },

  // ==================== CAMBIOS DE PRODUCTOS ====================
  cambiosProductos: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('cambios_productos')
        .select(`
          *,
          venta:ventas(id, no_factura, fecha),
          producto_entrada:producto_entrada_id(id, nombre, imagen_url, precio_venta),
          producto_salida:producto_salida_id(id, nombre, imagen_url, precio_venta),
          caja:cajas(id, nombre)
        `)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('cambios_productos')
        .select(`
          *,
          venta:ventas(id, no_factura, fecha),
          producto_entrada:producto_entrada_id(id, nombre, imagen_url, precio_venta),
          producto_salida:producto_salida_id(id, nombre, imagen_url, precio_venta),
          caja:cajas(id, nombre)
        `)
        .eq('id', id)
        .single();
      return { data, error };
    },

    getByVenta: async (ventaId) => {
      const { data, error } = await supabase
        .from('cambios_productos')
        .select(`
          *,
          producto_entrada:producto_entrada_id(id, nombre, imagen_url),
          producto_salida:producto_salida_id(id, nombre, imagen_url)
        `)
        .eq('venta_id', ventaId)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByProductoEntrada: async (productoId) => {
      const { data, error } = await supabase
        .from('cambios_productos')
        .select(`
          *,
          venta:ventas(id, no_factura),
          producto_salida:producto_salida_id(id, nombre)
        `)
        .eq('producto_entrada_id', productoId)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByProductoSalida: async (productoId) => {
      const { data, error } = await supabase
        .from('cambios_productos')
        .select(`
          *,
          venta:ventas(id, no_factura),
          producto_entrada:producto_entrada_id(id, nombre)
        `)
        .eq('producto_salida_id', productoId)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByCaja: async (cajaId) => {
      const { data, error } = await supabase
        .from('cambios_productos')
        .select(`
          *,
          venta:ventas(id, no_factura),
          producto_entrada:producto_entrada_id(id, nombre),
          producto_salida:producto_salida_id(id, nombre)
        `)
        .eq('caja_id', cajaId)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getConDiferencia: async () => {
      const { data, error } = await supabase
        .from('cambios_productos')
        .select(`
          *,
          venta:ventas(id, no_factura),
          producto_entrada:producto_entrada_id(id, nombre, imagen_url),
          producto_salida:producto_salida_id(id, nombre, imagen_url)
        `)
        .gt('diferencia_cobrada', 0)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getSinDiferencia: async () => {
      const { data, error } = await supabase
        .from('cambios_productos')
        .select(`
          *,
          venta:ventas(id, no_factura),
          producto_entrada:producto_entrada_id(id, nombre, imagen_url),
          producto_salida:producto_salida_id(id, nombre, imagen_url)
        `)
        .eq('diferencia_cobrada', 0)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    create: async (data) => {
      const cambioData = {
        ...data,
        fecha: new Date().toISOString(),
      };

      const { data: newCambio, error } = await supabase
        .from('cambios_productos')
        .insert([cambioData])
        .select(`
          *,
          venta:ventas(id, no_factura),
          producto_entrada:producto_entrada_id(id, nombre, imagen_url),
          producto_salida:producto_salida_id(id, nombre, imagen_url)
        `)
        .single();
      return { data: newCambio, error };
    },

    update: async (id, data) => {
      const { data: updatedCambio, error } = await supabase
        .from('cambios_productos')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          venta:ventas(id, no_factura),
          producto_entrada:producto_entrada_id(id, nombre, imagen_url),
          producto_salida:producto_salida_id(id, nombre, imagen_url)
        `)
        .single();
      return { data: updatedCambio, error };
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('cambios_productos')
        .delete()
        .eq('id', id);
      return { error };
    },

    getRecent: async (limit = 10) => {
      const { data, error } = await supabase
        .from('cambios_productos')
        .select(`
          *,
          venta:ventas(id, no_factura),
          producto_entrada:producto_entrada_id(id, nombre, imagen_url),
          producto_salida:producto_salida_id(id, nombre, imagen_url)
        `)
        .order('fecha', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getByDateRange: async (startDate, endDate) => {
      const { data, error } = await supabase
        .from('cambios_productos')
        .select(`
          *,
          venta:ventas(id, no_factura),
          producto_entrada:producto_entrada_id(id, nombre, imagen_url),
          producto_salida:producto_salida_id(id, nombre, imagen_url)
        `)
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getHoy: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await db.cambiosProductos.getByDateRange(
        today.toISOString(),
        tomorrow.toISOString()
      );
    },

    getTotalDiferenciaMes: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const { data } = await supabase
        .from('cambios_productos')
        .select('diferencia_cobrada')
        .gte('fecha', startOfMonth.toISOString())
        .lte('fecha', endOfMonth.toISOString());

      const total = data?.reduce((sum, cambio) => sum + Number(cambio.diferencia_cobrada || 0), 0) || 0;
      return { data: total, error: null };
    },

    getEstadisticas: async () => {
      const { data: allCambios } = await supabase
        .from('cambios_productos')
        .select('*');

      const conDiferencia = allCambios?.filter(c => Number(c.diferencia_cobrada) > 0) || [];
      const sinDiferencia = allCambios?.filter(c => Number(c.diferencia_cobrada) === 0) || [];

      const totalDiferencia = allCambios?.reduce((sum, c) => sum + Number(c.diferencia_cobrada || 0), 0) || 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const cambiosHoy = allCambios?.filter(c =>
        new Date(c.fecha) >= today
      ) || [];

      const promedioDiferencia = conDiferencia.length > 0
        ? (conDiferencia.reduce((sum, c) => sum + Number(c.diferencia_cobrada), 0) / conDiferencia.length)
        : 0;

      return {
        data: {
          totalCambios: allCambios?.length || 0,
          conDiferencia: conDiferencia.length,
          sinDiferencia: sinDiferencia.length,
          totalDiferenciaCobrada: totalDiferencia.toFixed(2),
          cambiosHoy: cambiosHoy.length,
          promedioDiferencia: promedioDiferencia.toFixed(2),
          porcentajeConDiferencia: allCambios?.length > 0
            ? Math.round((conDiferencia.length / allCambios.length) * 100)
            : 0,
        },
        error: null,
      };
    },

    getProductosMasCambiados: async (limit = 10) => {
      const { data: cambiosEntrada } = await supabase
        .from('cambios_productos')
        .select('producto_entrada_id, inventario!cambios_productos_producto_entrada_id_fkey(nombre, imagen_url)');

      if (!cambiosEntrada) return { data: [], error: null };

      const productosCount = {};
      cambiosEntrada.forEach(cambio => {
        const id = cambio.producto_entrada_id;
        if (!productosCount[id]) {
          productosCount[id] = {
            producto_id: id,
            nombre: cambio.inventario?.nombre || 'Desconocido',
            imagen_url: cambio.inventario?.imagen_url,
            veces_cambiado: 0,
          };
        }
        productosCount[id].veces_cambiado++;
      });

      const topProductos = Object.values(productosCount)
        .sort((a, b) => b.veces_cambiado - a.veces_cambiado)
        .slice(0, limit);

      return { data: topProductos, error: null };
    },

    getProductosMasSolicitados: async (limit = 10) => {
      const { data: cambiosSalida } = await supabase
        .from('cambios_productos')
        .select('producto_salida_id, inventario!cambios_productos_producto_salida_id_fkey(nombre, imagen_url)');

      if (!cambiosSalida) return { data: [], error: null };

      const productosCount = {};
      cambiosSalida.forEach(cambio => {
        const id = cambio.producto_salida_id;
        if (!productosCount[id]) {
          productosCount[id] = {
            producto_id: id,
            nombre: cambio.inventario?.nombre || 'Desconocido',
            imagen_url: cambio.inventario?.imagen_url,
            veces_solicitado: 0,
          };
        }
        productosCount[id].veces_solicitado++;
      });

      const topProductos = Object.values(productosCount)
        .sort((a, b) => b.veces_solicitado - a.veces_solicitado)
        .slice(0, limit);

      return { data: topProductos, error: null };
    },
  },

  // ==================== DEVOLUCIONES ====================
  devoluciones: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('devoluciones')
        .select('*, venta:ventas(id, no_factura, fecha), producto:inventario(id, nombre, imagen_url), caja:cajas(id, nombre)')
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('devoluciones')
        .select('*, venta:ventas(id, no_factura, fecha), producto:inventario(id, nombre, imagen_url), caja:cajas(id, nombre)')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getByVenta: async (ventaId) => {
      const { data, error } = await supabase
        .from('devoluciones')
        .select('*, producto:inventario(id, nombre, imagen_url)')
        .eq('venta_id', ventaId)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByProducto: async (productoId) => {
      const { data, error } = await supabase
        .from('devoluciones')
        .select('*, venta:ventas(id, no_factura, fecha)')
        .eq('producto_id', productoId)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByCaja: async (cajaId) => {
      const { data, error } = await supabase
        .from('devoluciones')
        .select('*, venta:ventas(id, no_factura), producto:inventario(id, nombre)')
        .eq('caja_id', cajaId)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getAprobadas: async () => {
      const { data, error } = await supabase
        .from('devoluciones')
        .select('*, venta:ventas(id, no_factura), producto:inventario(id, nombre, imagen_url)')
        .eq('cumple_politicas', true)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getRechazadas: async () => {
      const { data, error } = await supabase
        .from('devoluciones')
        .select('*, venta:ventas(id, no_factura), producto:inventario(id, nombre, imagen_url)')
        .eq('cumple_politicas', false)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByEstadoProducto: async (estado) => {
      const { data, error } = await supabase
        .from('devoluciones')
        .select('*, venta:ventas(id, no_factura), producto:inventario(id, nombre, imagen_url)')
        .eq('estado_producto', estado)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    search: async (query) => {
      const { data, error } = await supabase
        .from('devoluciones')
        .select('*, venta:ventas(id, no_factura), producto:inventario(id, nombre, imagen_url)')
        .or(`no_factura.ilike.%${query}%,motivo.ilike.%${query}%,responsable.ilike.%${query}%`)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    create: async (data) => {
      const devolucionData = {
        ...data,
        fecha: new Date().toISOString(),
      };

      const { data: newDevolucion, error } = await supabase
        .from('devoluciones')
        .insert([devolucionData])
        .select('*, venta:ventas(id, no_factura), producto:inventario(id, nombre, imagen_url)')
        .single();
      return { data: newDevolucion, error };
    },

    update: async (id, data) => {
      const { data: updatedDevolucion, error } = await supabase
        .from('devoluciones')
        .update(data)
        .eq('id', id)
        .select('*, venta:ventas(id, no_factura), producto:inventario(id, nombre, imagen_url)')
        .single();
      return { data: updatedDevolucion, error };
    },

    updateCumplePoliticas: async (id, cumple) => {
      const { data, error } = await supabase
        .from('devoluciones')
        .update({ cumple_politicas: cumple })
        .eq('id', id)
        .select('*, venta:ventas(id, no_factura), producto:inventario(id, nombre, imagen_url)')
        .single();
      return { data, error };
    },

    aprobar: async (id) => {
      return await db.devoluciones.updateCumplePoliticas(id, true);
    },

    rechazar: async (id) => {
      return await db.devoluciones.updateCumplePoliticas(id, false);
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('devoluciones')
        .delete()
        .eq('id', id);
      return { error };
    },

    getRecent: async (limit = 10) => {
      const { data, error } = await supabase
        .from('devoluciones')
        .select('*, venta:ventas(id, no_factura), producto:inventario(id, nombre, imagen_url)')
        .order('fecha', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getByDateRange: async (startDate, endDate) => {
      const { data, error } = await supabase
        .from('devoluciones')
        .select('*, venta:ventas(id, no_factura), producto:inventario(id, nombre, imagen_url)')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getHoy: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await db.devoluciones.getByDateRange(
        today.toISOString(),
        tomorrow.toISOString()
      );
    },

    getTotalDevueltoMes: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const { data } = await supabase
        .from('devoluciones')
        .select('monto_devuelto')
        .gte('fecha', startOfMonth.toISOString())
        .lte('fecha', endOfMonth.toISOString());

      const total = data?.reduce((sum, dev) => sum + Number(dev.monto_devuelto || 0), 0) || 0;
      return { data: total, error: null };
    },

    getEstadisticas: async () => {
      const { data: allDevoluciones } = await supabase
        .from('devoluciones')
        .select('*');

      const aprobadas = allDevoluciones?.filter(d => d.cumple_politicas === true) || [];
      const rechazadas = allDevoluciones?.filter(d => d.cumple_politicas === false) || [];
      const pendientes = allDevoluciones?.filter(d => d.cumple_politicas === null) || [];

      const totalDevuelto = allDevoluciones?.reduce((sum, d) => sum + Number(d.monto_devuelto || 0), 0) || 0;
      const totalUnidades = allDevoluciones?.reduce((sum, d) => sum + (d.cantidad || 0), 0) || 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const devolucionesHoy = allDevoluciones?.filter(d =>
        new Date(d.fecha) >= today
      ) || [];

      const estadosProducto = {};
      allDevoluciones?.forEach(d => {
        if (d.estado_producto) {
          estadosProducto[d.estado_producto] = (estadosProducto[d.estado_producto] || 0) + 1;
        }
      });

      const motivos = {};
      allDevoluciones?.forEach(d => {
        if (d.motivo) {
          motivos[d.motivo] = (motivos[d.motivo] || 0) + 1;
        }
      });

      const motivoMasFrecuente = Object.entries(motivos)
        .sort(([, a], [, b]) => b - a)[0];

      const estadoMasFrecuente = Object.entries(estadosProducto)
        .sort(([, a], [, b]) => b - a)[0];

      const tasaAprobacion = allDevoluciones?.length > 0
        ? Math.round((aprobadas.length / allDevoluciones.length) * 100)
        : 0;

      return {
        data: {
          totalDevoluciones: allDevoluciones?.length || 0,
          aprobadas: aprobadas.length,
          rechazadas: rechazadas.length,
          pendientes: pendientes.length,
          totalDevuelto: totalDevuelto.toFixed(2),
          totalUnidades,
          devolucionesHoy: devolucionesHoy.length,
          motivoMasFrecuente: motivoMasFrecuente ? motivoMasFrecuente[0] : null,
          frecuenciaMotivo: motivoMasFrecuente ? motivoMasFrecuente[1] : 0,
          estadoMasFrecuente: estadoMasFrecuente ? estadoMasFrecuente[0] : null,
          frecuenciaEstado: estadoMasFrecuente ? estadoMasFrecuente[1] : 0,
          tasaAprobacion,
          promedioDevolucion: allDevoluciones?.length > 0
            ? (totalDevuelto / allDevoluciones.length).toFixed(2)
            : 0,
        },
        error: null,
      };
    },

    getEstadisticasPorMotivo: async () => {
      const { data: allDevoluciones } = await supabase
        .from('devoluciones')
        .select('motivo, monto_devuelto, cantidad');

      if (!allDevoluciones) return { data: [], error: null };

      const motivosStats = {};
      allDevoluciones.forEach(dev => {
        const motivo = dev.motivo || 'Sin especificar';
        if (!motivosStats[motivo]) {
          motivosStats[motivo] = {
            motivo,
            count: 0,
            totalDevuelto: 0,
            totalUnidades: 0,
          };
        }
        motivosStats[motivo].count++;
        motivosStats[motivo].totalDevuelto += Number(dev.monto_devuelto || 0);
        motivosStats[motivo].totalUnidades += dev.cantidad || 0;
      });

      const stats = Object.values(motivosStats)
        .sort((a, b) => b.count - a.count)
        .map(s => ({
          ...s,
          totalDevuelto: s.totalDevuelto.toFixed(2),
        }));

      return { data: stats, error: null };
    },

    getEstadisticasPorEstado: async () => {
      const { data: allDevoluciones } = await supabase
        .from('devoluciones')
        .select('estado_producto, monto_devuelto, cantidad');

      if (!allDevoluciones) return { data: [], error: null };

      const estadosStats = {};
      allDevoluciones.forEach(dev => {
        const estado = dev.estado_producto || 'Sin especificar';
        if (!estadosStats[estado]) {
          estadosStats[estado] = {
            estado,
            count: 0,
            totalDevuelto: 0,
            totalUnidades: 0,
          };
        }
        estadosStats[estado].count++;
        estadosStats[estado].totalDevuelto += Number(dev.monto_devuelto || 0);
        estadosStats[estado].totalUnidades += dev.cantidad || 0;
      });

      const stats = Object.values(estadosStats)
        .sort((a, b) => b.count - a.count)
        .map(s => ({
          ...s,
          totalDevuelto: s.totalDevuelto.toFixed(2),
        }));

      return { data: stats, error: null };
    },
  },

  // ==================== ECOMMERCE ORDER ITEMS ====================
  ecommerceOrderItems: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('ecommerce_order_items')
        .select('*, order:ecommerce_orders(id, tracking_code, status), product:inventario(id, nombre, imagen_url)')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('ecommerce_order_items')
        .select('*, order:ecommerce_orders(id, tracking_code, status), product:inventario(id, nombre, imagen_url)')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getByOrder: async (orderId) => {
      const { data, error } = await supabase
        .from('ecommerce_order_items')
        .select('*, product:inventario(id, nombre, imagen_url, stock_actual)')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      return { data, error };
    },

    getByProduct: async (productId) => {
      const { data, error } = await supabase
        .from('ecommerce_order_items')
        .select('*, order:ecommerce_orders(id, tracking_code, status, customer_name)')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      return { data, error };
    },

    create: async (data) => {
      const itemData = {
        ...data,
        line_total: Number(data.unit_price) * Number(data.qty),
        created_at: new Date().toISOString(),
      };

      const { data: newItem, error } = await supabase
        .from('ecommerce_order_items')
        .insert([itemData])
        .select('*, product:inventario(id, nombre, imagen_url)')
        .single();
      return { data: newItem, error };
    },

    createBulk: async (items) => {
      const itemsData = items.map(item => ({
        ...item,
        line_total: Number(item.unit_price) * Number(item.qty),
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('ecommerce_order_items')
        .insert(itemsData)
        .select('*, product:inventario(id, nombre, imagen_url)');
      return { data, error };
    },

    update: async (id, data) => {
      const updateData = { ...data };
      
      if (data.unit_price !== undefined || data.qty !== undefined) {
        const { data: currentItem } = await supabase
          .from('ecommerce_order_items')
          .select('unit_price, qty')
          .eq('id', id)
          .single();

        if (currentItem) {
          const price = data.unit_price !== undefined ? Number(data.unit_price) : Number(currentItem.unit_price);
          const quantity = data.qty !== undefined ? Number(data.qty) : Number(currentItem.qty);
          updateData.line_total = price * quantity;
        }
      }

      const { data: updatedItem, error } = await supabase
        .from('ecommerce_order_items')
        .update(updateData)
        .eq('id', id)
        .select('*, product:inventario(id, nombre, imagen_url)')
        .single();
      return { data: updatedItem, error };
    },

    updateQuantity: async (id, qty) => {
      const { data: item } = await supabase
        .from('ecommerce_order_items')
        .select('unit_price')
        .eq('id', id)
        .single();

      if (!item) return { data: null, error: { message: 'Item no encontrado' } };

      const { data, error } = await supabase
        .from('ecommerce_order_items')
        .update({
          qty,
          line_total: Number(item.unit_price) * Number(qty),
        })
        .eq('id', id)
        .select('*, product:inventario(id, nombre, imagen_url)')
        .single();
      return { data, error };
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('ecommerce_order_items')
        .delete()
        .eq('id', id);
      return { error };
    },

    deleteByOrder: async (orderId) => {
      const { error } = await supabase
        .from('ecommerce_order_items')
        .delete()
        .eq('order_id', orderId);
      return { error };
    },

    getOrderTotal: async (orderId) => {
      const { data: items } = await supabase
        .from('ecommerce_order_items')
        .select('line_total')
        .eq('order_id', orderId);

      const total = items?.reduce((sum, item) => sum + Number(item.line_total), 0) || 0;
      return { data: total, error: null };
    },

    getOrderSummary: async (orderId) => {
      const { data: items } = await supabase
        .from('ecommerce_order_items')
        .select('qty, line_total')
        .eq('order_id', orderId);

      if (!items) return { data: null, error: { message: 'No items found' } };

      const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
      const totalAmount = items.reduce((sum, item) => sum + Number(item.line_total), 0);

      return {
        data: {
          itemsCount: items.length,
          totalUnits: totalItems,
          totalAmount: totalAmount.toFixed(2),
        },
        error: null,
      };
    },

    getTopProducts: async (limit = 10, startDate = null, endDate = null) => {
      let query = supabase
        .from('ecommerce_order_items')
        .select('product_id, product_name, qty, inventario(imagen_url)');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: items } = await query;

      if (!items) return { data: [], error: null };

      const productSales = {};
      items.forEach(item => {
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = {
            product_id: item.product_id,
            product_name: item.product_name,
            total_sold: 0,
            imagen_url: item.inventario?.imagen_url,
          };
        }
        productSales[item.product_id].total_sold += item.qty;
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, limit);

      return { data: topProducts, error: null };
    },

    getEstadisticas: async () => {
      const { data: allItems } = await supabase
        .from('ecommerce_order_items')
        .select('*');

      const totalItems = allItems?.length || 0;
      const totalUnidades = allItems?.reduce((sum, item) => sum + item.qty, 0) || 0;
      const totalVentas = allItems?.reduce((sum, item) => sum + Number(item.line_total), 0) || 0;

      const uniqueProducts = new Set(allItems?.map(item => item.product_id) || []);
      const uniqueOrders = new Set(allItems?.map(item => item.order_id) || []);

      const avgUnitsPerOrder = uniqueOrders.size > 0 ? (totalUnidades / uniqueOrders.size).toFixed(2) : 0;
      const avgAmountPerOrder = uniqueOrders.size > 0 ? (totalVentas / uniqueOrders.size).toFixed(2) : 0;

      return {
        data: {
          totalItems,
          totalUnidades,
          totalVentas: totalVentas.toFixed(2),
          productosUnicos: uniqueProducts.size,
          ordenesConItems: uniqueOrders.size,
          promedioUnidadesPorOrden: avgUnitsPerOrder,
          promedioMontoPorOrden: avgAmountPerOrder,
        },
        error: null,
      };
    },
  },

  // ==================== INCIDENTES ====================
  incidentes: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },

    getByFolio: async (folio) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('folio', folio)
        .single();
      return { data, error };
    },

    getByEstado: async (estado) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('estado', estado)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getRegistrados: async () => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('estado', 'registrado')
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getEnProceso: async () => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('estado', 'en_proceso')
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getResueltos: async () => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('estado', 'resuelto')
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByTipo: async (tipo) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('tipo_incidente', tipo)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByEmpleado: async (empleadoNombre) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('empleado_nombre', empleadoNombre)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByCliente: async (clienteNombre) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('cliente_nombre', clienteNombre)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getByCreador: async (creadorId) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('creado_por', creadorId)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getConReembolso: async () => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('aplica_reembolso', true)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getConCompensacion: async () => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('aplica_compensacion', true)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    search: async (query) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .or(`folio.ilike.%${query}%,tipo_incidente.ilike.%${query}%,empleado_nombre.ilike.%${query}%,cliente_nombre.ilike.%${query}%,descripcion.ilike.%${query}%`)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    create: async (data) => {
      const incidenteData = {
        ...data,
        fecha: data.fecha || new Date().toISOString(),
      };

      const { data: nuevoIncidente, error } = await supabase
        .from('incidentes')
        .insert([incidenteData])
        .select()
        .single();
      return { data: nuevoIncidente, error };
    },

    update: async (id, data) => {
      const { data: incidenteActualizado, error } = await supabase
        .from('incidentes')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      return { data: incidenteActualizado, error };
    },

    updateEstado: async (id, estado) => {
      const { data, error } = await supabase
        .from('incidentes')
        .update({ estado })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },

    marcarEnProceso: async (id) => {
      return await db.incidentes.updateEstado(id, 'en_proceso');
    },

    marcarResuelto: async (id) => {
      return await db.incidentes.updateEstado(id, 'resuelto');
    },

    delete: async (id) => {
      const { error } = await supabase
        .from('incidentes')
        .delete()
        .eq('id', id);
      return { error };
    },

    getRecent: async (limit = 10) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(limit);
      return { data, error };
    },

    getByDateRange: async (startDate, endDate) => {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getHoy: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .gte('fecha', today.toISOString())
        .lt('fecha', tomorrow.toISOString())
        .order('fecha', { ascending: false });
      return { data, error };
    },

    getEstadisticas: async () => {
      const { data: allIncidentes } = await supabase
        .from('incidentes')
        .select('*');

      const registrados = allIncidentes?.filter(i => i.estado === 'registrado') || [];
      const enProceso = allIncidentes?.filter(i => i.estado === 'en_proceso') || [];
      const resueltos = allIncidentes?.filter(i => i.estado === 'resuelto') || [];

      const conReembolso = allIncidentes?.filter(i => i.aplica_reembolso) || [];
      const conCompensacion = allIncidentes?.filter(i => i.aplica_compensacion) || [];

      const totalPerdidas = allIncidentes?.reduce((sum, i) => sum + Number(i.monto_perdida || 0), 0) || 0;
      const totalCostos = allIncidentes?.reduce((sum, i) => sum + Number(i.costo_estimado || 0), 0) || 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const incidentesHoy = allIncidentes?.filter(i => 
        new Date(i.fecha) >= today
      ) || [];

      const tiposCount = {};
      allIncidentes?.forEach(i => {
        if (i.tipo_incidente) {
          tiposCount[i.tipo_incidente] = (tiposCount[i.tipo_incidente] || 0) + 1;
        }
      });

      const tipoMasFrecuente = Object.entries(tiposCount)
        .sort(([, a], [, b]) => b - a)[0];

      return {
        data: {
          totalIncidentes: allIncidentes?.length || 0,
          registrados: registrados.length,
          enProceso: enProceso.length,
          resueltos: resueltos.length,
          conReembolso: conReembolso.length,
          conCompensacion: conCompensacion.length,
          totalPerdidas: totalPerdidas.toFixed(2),
          totalCostos: totalCostos.toFixed(2),
          incidentesHoy: incidentesHoy.length,
          tipoMasFrecuente: tipoMasFrecuente ? tipoMasFrecuente[0] : null,
          frecuenciaMasFrecuente: tipoMasFrecuente ? tipoMasFrecuente[1] : 0,
          tasaResolucion: allIncidentes?.length > 0 
            ? Math.round((resueltos.length / allIncidentes.length) * 100) 
            : 0,
        },
        error: null,
      };
    },

    getEstadisticasPorTipo: async () => {
      const { data: allIncidentes } = await supabase
        .from('incidentes')
        .select('*');

      const porTipo = {};
      allIncidentes?.forEach(i => {
        if (!i.tipo_incidente) return;
        
        if (!porTipo[i.tipo_incidente]) {
          porTipo[i.tipo_incidente] = {
            tipo: i.tipo_incidente,
            cantidad: 0,
            perdidas: 0,
            costos: 0,
            resueltos: 0,
          };
        }

        porTipo[i.tipo_incidente].cantidad++;
        porTipo[i.tipo_incidente].perdidas += Number(i.monto_perdida || 0);
        porTipo[i.tipo_incidente].costos += Number(i.costo_estimado || 0);
        if (i.estado === 'resuelto') {
          porTipo[i.tipo_incidente].resueltos++;
        }
      });

      const resultado = Object.values(porTipo).map(tipo => ({
        ...tipo,
        perdidas: tipo.perdidas.toFixed(2),
        costos: tipo.costos.toFixed(2),
        tasaResolucion: tipo.cantidad > 0 
          ? Math.round((tipo.resueltos / tipo.cantidad) * 100) 
          : 0,
      }));

      return { data: resultado, error: null };
    },
  },

  // ==================== SUCURSALES ====================
  sucursales: {
    listActivas: async () => {
      const { data: rpcData, error: rpcError } = await supabase.rpc('list_sucursales_activas');
      if (!rpcError && Array.isArray(rpcData)) {
        return { data: rpcData, error: null };
      }
      const direct = await supabase
        .from('sucursales')
        .select('id, codigo, nombre, direccion, telefono, login_phone, es_matriz, activa, created_at')
        .eq('activa', true)
        .order('es_matriz', { ascending: false })
        .order('nombre', { ascending: true });
      if (!direct.error) {
        return { data: direct.data || [], error: null };
      }
      return { data: [], error: rpcError || direct.error };
    },

    crear: async ({ codigo, nombre, direccion, telefono }) => {
      const { data, error } = await supabase.rpc('crear_sucursal', {
        p_codigo: codigo,
        p_nombre: nombre,
        p_direccion: direccion || null,
        p_telefono: telefono || null,
      });
      return { data, error };
    },

    vincularAdmin: async ({ sucursalId, userId, nombre }) => {
      const { data, error } = await supabase.rpc('vincular_admin_sucursal', {
        p_sucursal_id: sucursalId,
        p_user_id: userId,
        p_nombre: nombre || null,
      });
      return { data, error };
    },
  },

  cajaChica: {
    getSaldo: async (sucursalId) => {
      if (!sucursalId) return { data: 0, error: null };
      const { data, error } = await supabase.rpc('salon_caja_chica_get', {
        p_sucursal_id: sucursalId,
      });
      if (error) return { data: null, error };
      return { data: Number(data ?? 0), error: null };
    },
    setSaldo: async (sucursalId, saldo) => {
      if (!sucursalId) {
        return { data: null, error: { message: 'Sucursal no definida para caja chica.' } };
      }
      const { data, error } = await supabase.rpc('salon_caja_chica_set', {
        p_saldo: saldo,
        p_sucursal_id: sucursalId,
      });
      if (error) return { data: null, error };
      return { data: Number(data ?? saldo), error: null };
    },
  },

  inventarioStockSucursal: {
    getForSucursal: async (sucursalId) => {
      if (!sucursalId) return { data: [], error: null };
      const { data, error } = await supabase
        .from('inventario_stock_sucursal')
        .select('*')
        .eq('sucursal_id', sucursalId);
      return { data: data || [], error };
    },

    getStock: async (sucursalId, inventarioId) => {
      if (!sucursalId || !inventarioId) return { data: 0, error: null };
      const { data, error } = await supabase
        .from('inventario_stock_sucursal')
        .select('stock_actual')
        .eq('sucursal_id', sucursalId)
        .eq('inventario_id', inventarioId)
        .maybeSingle();
      if (error) return { data: 0, error };
      return { data: Number(data?.stock_actual ?? 0), error: null };
    },

    mergeCatalogo: (items, stockRows) => mergeInventarioWithSucursalStock(items, stockRows),
  },

  // ==================== ESTADÍSTICAS ====================
  stats: {
    // Resumen del dashboard
    getDashboard: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Citas de hoy
      const { count: citasHoy } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .gte('fecha_hora', today.toISOString())
        .lt('fecha_hora', tomorrow.toISOString());

      // Total clientes
      const { count: totalClientes } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });

      // Total empleados activos
      const { count: totalEmpleados } = await supabase
        .from('empleados')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);

      // Citas pendientes
      const { count: citasPendientes } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente')
        .gte('fecha_hora', today.toISOString());

      // Ingresos del mes actual
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

      const { data: citasMes } = await supabase
        .from('citas')
        .select('precio')
        .eq('venta_generada', true)
        .gte('fecha_hora', startOfMonth.toISOString())
        .lte('fecha_hora', endOfMonth.toISOString());

      const ingresosMes = citasMes?.reduce((sum, cita) => sum + Number(cita.precio), 0) || 0;

      // Órdenes de e-commerce de hoy
      const { count: ordenesHoy } = await supabase
        .from('ecommerce_orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      // Órdenes pendientes
      const { count: ordenesPendientes } = await supabase
        .from('ecommerce_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed', 'prepared']);

      // Ventas e-commerce del mes
      const { data: ordenesMes } = await supabase
        .from('ecommerce_orders')
        .select('total_amount')
        .neq('status', 'cancelled')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      const ventasEcommerceMes = ordenesMes?.reduce((sum, orden) => sum + Number(orden.total_amount), 0) || 0;

      // Estadísticas de inventario
      const statsInventario = await db.inventario.getEstadisticas();

      // Ventas del mes
      const { data: statsVentas } = await db.ventas.getEstadisticas(
        startOfMonth.toISOString(),
        endOfMonth.toISOString()
      );

      // Ventas de hoy
      const { data: ventasHoy } = await db.ventas.getHoy();
      const totalVentasHoy = ventasHoy?.reduce((sum, v) => sum + Number(v.total || v.monto || 0), 0) || 0;

      // Estadísticas de usuarios del sistema
      const { data: statsProfiles } = await db.profiles.getEstadisticas();

      // Estadísticas de metas
      const { data: statsMetas } = await db.metas.getEstadisticas();

      // Estadísticas de marketing posts
      const { data: statsMarketing } = await db.marketingPosts.getEstadisticas();

      // Estadísticas de marketing post likes
      const { data: statsMarketingLikes } = await db.marketingPostLikes.getEstadisticas();

      // Estadísticas de marketing direct messages
      const { data: statsDirectMessages } = await db.marketingDirectMessages.getEstadisticas();

      // Estadísticas de marketing comments
      const { data: statsComments } = await db.marketingComments.getEstadisticas();

      // Estadísticas de incidentes
      const { data: statsIncidentes } = await db.incidentes.getEstadisticas();

      // Estadísticas de ecommerce order items
      const { data: statsOrderItems } = await db.ecommerceOrderItems.getEstadisticas();

      // Estadísticas de devoluciones
      const { data: statsDevoluciones } = await db.devoluciones.getEstadisticas();

      // Estadísticas de cambios de productos
      const { data: statsCambios } = await db.cambiosProductos.getEstadisticas();

      // Estadísticas de cajas
      const { data: statsCajas } = await db.cajas.getEstadisticas();

      return {
        citasHoy: citasHoy || 0,
        totalClientes: totalClientes || 0,
        totalEmpleados: totalEmpleados || 0,
        citasPendientes: citasPendientes || 0,
        ingresosMes: ingresosMes,
        ordenesHoy: ordenesHoy || 0,
        ordenesPendientes: ordenesPendientes || 0,
        ventasEcommerceMes: ventasEcommerceMes,
        // Inventario
        totalProductos: statsInventario.data?.totalProductos || 0,
        productosBajoStock: statsInventario.data?.productosBajoStock || 0,
        productosSinStock: statsInventario.data?.productosSinStock || 0,
        valorInventario: statsInventario.data?.valorInventario || 0,
        // Ventas
        ventasHoy: ventasHoy?.length || 0,
        totalVentasHoy: totalVentasHoy.toFixed(2),
        ventasMes: statsVentas?.totalVentas || 0,
        ventasTotalesMes: statsVentas?.ventasTotales || 0,
        // Usuarios del Sistema
        totalUsuarios: statsProfiles?.totalUsuarios || 0,
        adminsCount: statsProfiles?.admins || 0,
        staffCount: statsProfiles?.legacyStaff || 0,
        // Metas y Objetivos
        totalMetas: statsMetas?.totalMetas || 0,
        metasActivas: statsMetas?.metasActivas || 0,
        metasCompletadas: statsMetas?.metasCompletadas || 0,
        progresoPromedioMetas: statsMetas?.progresoPromedio || 0,
        // Marketing Posts
        totalPosts: statsMarketing?.totalPosts || 0,
        postsPublicados: statsMarketing?.published || 0,
        postsBorradores: statsMarketing?.drafts || 0,
        totalVistasMarketing: statsMarketing?.totalViews || 0,
        totalReacciones: statsMarketing?.totalReactions || 0,
        // Marketing Likes
        totalLikes: statsMarketingLikes?.totalLikes || 0,
        postsConLikes: statsMarketingLikes?.postsConLikes || 0,
        clientesActivosMarketing: statsMarketingLikes?.clientesActivos || 0,
        likesHoy: statsMarketingLikes?.likesHoy || 0,
        // Marketing Direct Messages
        totalMensajesDirectos: statsDirectMessages?.totalMensajes || 0,
        mensajesPendientes: statsDirectMessages?.pending || 0,
        mensajesEntregados: statsDirectMessages?.delivered || 0,
        mensajesFallidos: statsDirectMessages?.failed || 0,
        mensajesHoy: statsDirectMessages?.mensajesHoy || 0,
        tasaEntregaMensajes: statsDirectMessages?.tasaEntrega || 0,
        // Marketing Comments
        totalComentarios: statsComments?.totalComentarios || 0,
        comentariosVisibles: statsComments?.visible || 0,
        comentariosOcultos: statsComments?.hidden || 0,
        comentariosPendientes: statsComments?.pending || 0,
        comentariosHoy: statsComments?.comentariosHoy || 0,
        postsConComentarios: statsComments?.postsConComentarios || 0,
        // Incidentes
        totalIncidentes: statsIncidentes?.totalIncidentes || 0,
        incidentesRegistrados: statsIncidentes?.registrados || 0,
        incidentesEnProceso: statsIncidentes?.enProceso || 0,
        incidentesResueltos: statsIncidentes?.resueltos || 0,
        incidentesHoy: statsIncidentes?.incidentesHoy || 0,
        totalPerdidasIncidentes: statsIncidentes?.totalPerdidas || 0,
        tasaResolucionIncidentes: statsIncidentes?.tasaResolucion || 0,
        // E-commerce Order Items
        totalOrderItems: statsOrderItems?.totalItems || 0,
        totalUnidadesVendidas: statsOrderItems?.totalUnidades || 0,
        totalVentasOrderItems: statsOrderItems?.totalVentas || 0,
        productosUnicosVendidos: statsOrderItems?.productosUnicos || 0,
        promedioUnidadesPorOrden: statsOrderItems?.promedioUnidadesPorOrden || 0,
        // Cajas
        totalCajas: statsCajas?.totalCajas || 0,
        cajasAbiertas: statsCajas?.cajasAbiertas || 0,
        cajasCerradas: statsCajas?.cajasCerradas || 0,
        cajasHoy: statsCajas?.cajasHoy || 0,
        promedioAperturaCaja: statsCajas?.promedioApertura || 0,
        promedioCierreCaja: statsCajas?.promedioCierre || 0,
        // Devoluciones
        totalDevoluciones: statsDevoluciones?.totalDevoluciones || 0,
        devolucionesAprobadas: statsDevoluciones?.aprobadas || 0,
        devolucionesRechazadas: statsDevoluciones?.rechazadas || 0,
        devolucionesPendientes: statsDevoluciones?.pendientes || 0,
        devolucionesHoy: statsDevoluciones?.devolucionesHoy || 0,
        totalDevuelto: statsDevoluciones?.totalDevuelto || 0,
        tasaAprobacionDevoluciones: statsDevoluciones?.tasaAprobacion || 0,
        promedioDevolucion: statsDevoluciones?.promedioDevolucion || 0,
        // Cambios de Productos
        totalCambios: statsCambios?.totalCambios || 0,
        cambiosConDiferencia: statsCambios?.conDiferencia || 0,
        cambiosSinDiferencia: statsCambios?.sinDiferencia || 0,
        cambiosHoy: statsCambios?.cambiosHoy || 0,
        totalDiferenciaCobrada: statsCambios?.totalDiferenciaCobrada || 0,
        promedioDiferenciaCambio: statsCambios?.promedioDiferencia || 0,
        porcentajeCambiosConDiferencia: statsCambios?.porcentajeConDiferencia || 0,
        // Total General
        ingresosTotalesMes: ingresosMes + ventasEcommerceMes + Number(statsVentas?.ventasTotales || 0),
      };
    },

    // Estadísticas por período
    getPorPeriodo: async (startDate, endDate) => {
      const { data: citas } = await supabase
        .from('citas')
        .select('precio, estado, venta_generada, fecha_hora')
        .gte('fecha_hora', startDate)
        .lte('fecha_hora', endDate);

      const totalCitas = citas?.length || 0;
      const citasCompletadas = citas?.filter(c => c.estado === 'completada').length || 0;
      const ingresos = citas?.filter(c => c.venta_generada)
        .reduce((sum, c) => sum + Number(c.precio), 0) || 0;

      return {
        totalCitas,
        citasCompletadas,
        ingresos,
        promedioPorCita: totalCitas > 0 ? (ingresos / totalCitas).toFixed(2) : 0,
      };
    },
  },
};

/**
 * Lee URI local (file:// / content://) y sube a un bucket de Supabase Storage.
 */
async function uploadStorageFromLocalUri(bucket, localUri, meta = {}) {
  const ext = String(meta.extension || 'bin')
    .replace(/^\./, '')
    .replace(/[^a-z0-9]/gi, '') || 'bin';
  const path = `salon/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const contentType = meta.contentType || 'application/octet-stream';

  try {
    let body;
    const uri = String(localUri || '');
    if (uri.startsWith('file://') || uri.startsWith('content://')) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType?.Base64 ?? 'base64',
      });
      const raw = globalThis.atob(base64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
      body = bytes;
    } else {
      const res = await fetch(uri);
      if (!res.ok) throw new Error('No se pudo leer el archivo');
      body = await res.blob();
    }

    const { data, error } = await supabase.storage.from(bucket).upload(path, body, {
      contentType,
      upsert: false,
    });
    if (error) return { error, publicUrl: null };
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { error: null, publicUrl: pub.publicUrl };
  } catch (e) {
    return { error: { message: e?.message || String(e) }, publicUrl: null };
  }
}

/**
 * Sube foto o video al bucket Storage `tendencias` (crealo en Supabase y definí políticas de lectura para App Clientes).
 * @param {string} localUri file:// o content://
 * @param {{ extension?: string, contentType?: string }} meta
 */
export async function uploadTendenciaMediaFromUri(localUri, meta = {}) {
  return uploadStorageFromLocalUri('tendencias', localUri, meta);
}

/** Bucket Storage `inventario` para imágenes de catálogo / tienda. */
export async function uploadInventarioMediaFromUri(localUri, meta = {}) {
  return uploadStorageFromLocalUri('inventario', localUri, meta);
}

export async function uploadIncidenteMediaFromUri(localUri, meta = {}) {
  return uploadStorageFromLocalUri('incidentes', localUri, meta);
}

export async function uploadMensajeMediaFromUri(localUri, meta = {}) {
  return uploadStorageFromLocalUri('mensajes', localUri, meta);
}

export async function uploadProveedorLogoFromUri(localUri, meta = {}) {
  return uploadStorageFromLocalUri('proveedores', localUri, meta);
}

/** Bucket Storage `empleados` — fotos de fichas del salón. */
export async function uploadEmpleadoFotoFromUri(localUri, meta = {}) {
  return uploadStorageFromLocalUri('empleados', localUri, meta);
}

/** Bucket Storage `clientes` — fotos de perfil de app clientes. */
export async function uploadClientePhotoFromUri(localUri, meta = {}) {
  return uploadStorageFromLocalUri('clientes', localUri, meta);
}

export {
  buildClienteExportPayload,
  buildClienteExportText,
  buildClienteExportJson,
  buildClienteFichaHtml,
} from './clienteExport.js';

// Helpers para verificar conexión
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('_health_check').select('*').limit(1);
    if (error && error.code !== 'PGRST116') throw error;
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    return false;
  }
};

export default supabase;
