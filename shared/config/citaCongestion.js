import { localCalendarDateString } from './localDate.js';
import { filterRowsBySucursal } from './salonSucursalHelpers.js';
import { getSlotStart } from './bookingSlots.js';
import {
  getSlotStartFromInstant,
  zonedCalendarDateString,
} from './bookingTimezone.js';
import { normalizeServicioCategoria } from './servicioCategorias.js';
import { splitBookingNotas } from './reservaCheckout.js';

/** Citas activas en la misma franja que marcan congestión. */
export const CITA_CONGESTION_THRESHOLD = 3;

/** Duración por defecto si la cita no trae duracion_minutos. */
export const CITA_DEFAULT_DURATION_MINUTES = 60;

/** Bucket para citas sin categoría resoluble (no cuenta en filtros por rama). */
export const CITA_CONGESTION_GENERAL = 'general';

const CATEGORIA_KEYWORDS = [
  { cat: 'Manicure', keys: ['manic', 'uñas', 'unas', 'nail', 'gelish', 'acrilic'] },
  { cat: 'Pedicure', keys: ['pedic', 'pie', 'podolog', 'pies'] },
  { cat: 'Corte y peinado', keys: ['corte', 'peinado', 'brush', 'estilo', 'blow'] },
  { cat: 'Coloración', keys: ['color', 'mechas', 'balayage', 'tinte', 'rubio', 'tono', 'decolor'] },
  {
    cat: 'Tratamientos capilares',
    keys: ['tratamiento capilar', 'hidrat', 'reconstruc', 'ampolla', 'botox capilar'],
  },
  { cat: 'Keratina / alisado', keys: ['kerat', 'alisado', 'progressiva', 'liss'] },
  { cat: 'Facial / spa', keys: ['facial', 'piel', 'spa', 'masaje', 'relax', 'ritual'] },
  { cat: 'Maquillaje', keys: ['maquillaje', 'makeup', 'evento', 'novia'] },
  { cat: 'Cejas y pestañas', keys: ['ceja', 'pestaña', 'pestañas', 'lash', 'brow', 'lifting', 'mirada'] },
  { cat: 'Barbería', keys: ['barber', 'barba', 'fade', 'afeit'] },
];

function normServicioText(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Lookup inventario → categoría/rama de congestión.
 * Expone .get(nombre) además de .byName / .byId para citas legacy y web.
 */
export function buildServicioCategoriaLookup(servicios = []) {
  const byName = new Map();
  const byId = new Map();
  for (const row of servicios) {
    const nombre = String(row?.nombre || row?.servicio || '').trim();
    const cat = normalizeServicioCategoria(row?.categoria);
    if (row?.id) byId.set(String(row.id), cat);
    if (nombre) byName.set(nombre.toLowerCase(), cat);
  }
  return {
    byName,
    byId,
    get(key) {
      return byName.get(String(key || '').trim().toLowerCase()) ?? null;
    },
  };
}

function inferCategoriaFromServicioText(servicio) {
  const n = normServicioText(servicio);
  if (!n) return null;
  for (const rule of CATEGORIA_KEYWORDS) {
    if (rule.keys.some((k) => n.includes(normServicioText(k)))) return rule.cat;
  }
  return null;
}

function servicioIdFromCita(cita) {
  if (cita?.servicio_id) return String(cita.servicio_id);
  const { meta } = splitBookingNotas(cita?.notas_servicio);
  if (meta?.servicio_id) return String(meta.servicio_id);
  return null;
}

function fuzzyLookupCategoria(segment, lookup) {
  const map = lookup?.byName;
  if (!map?.size) return null;
  const n = normServicioText(segment);
  if (!n) return null;
  let best = null;
  let bestLen = 0;
  for (const [name, cat] of map.entries()) {
    const nn = normServicioText(name);
    if (!nn) continue;
    if (n === nn || n.includes(nn) || nn.includes(n)) {
      if (nn.length > bestLen) {
        bestLen = nn.length;
        best = cat;
      }
    }
  }
  return best;
}

function lookupCategoriaForSegment(segment, lookup) {
  const key = String(segment || '').trim().toLowerCase();
  if (!key || !lookup) return null;
  const direct = lookup.get?.(key) ?? lookup.byName?.get(key) ?? null;
  if (direct) return direct;
  return fuzzyLookupCategoria(segment, lookup);
}

/** Resuelve la categoría/rama de congestión de una cita (null = legacy, excluir del filtro). */
export function resolveCitaCongestionCategoria(cita, lookup = null) {
  const servicioId = servicioIdFromCita(cita);
  if (servicioId && lookup?.byId?.has(servicioId)) {
    return lookup.byId.get(servicioId);
  }

  const servicio = String(cita?.servicio || '').trim();
  if (!servicio) return null;

  const segments = servicio.split(/\s*[·|,]\s*/).map((s) => s.trim()).filter(Boolean);
  const candidates = segments.length > 0 ? segments : [servicio];

  for (const seg of candidates) {
    const fromLookup = lookupCategoriaForSegment(seg, lookup);
    if (fromLookup) return fromLookup;
  }

  const fromFull = lookupCategoriaForSegment(servicio, lookup);
  if (fromFull) return fromFull;

  const inferred = inferCategoriaFromServicioText(servicio);
  return inferred ? normalizeServicioCategoria(inferred) : null;
}

/** ¿La cita cuenta para la categoría/rama filtrada? */
export function citaMatchesCongestionCategoria(cita, filterCategoria, lookup = null) {
  const filter = String(filterCategoria || '').trim();
  if (!filter || filter === CITA_CONGESTION_GENERAL) return true;
  const citaCat = resolveCitaCongestionCategoria(cita, lookup);
  if (!citaCat) return false;
  return normalizeServicioCategoria(citaCat) === normalizeServicioCategoria(filter);
}

/** Fin de ventana de la cita (inicio + duración estimada). */
export function citaNoShowDeadline(cita) {
  if (!cita?.fecha_hora) return null;
  const start = new Date(cita.fecha_hora);
  if (Number.isNaN(start.getTime())) return null;
  const dur = Number(cita.duracion_minutos);
  const minutes =
    Number.isFinite(dur) && dur > 0 ? dur : CITA_DEFAULT_DURATION_MINUTES;
  return new Date(start.getTime() + minutes * 60 * 1000);
}

/** ¿Ya pasó la ventana sin visita? (no cuenta para congestión; RPC las cancela). */
export function isCitaPastNoShowWindow(cita, now = new Date()) {
  const deadline = citaNoShowDeadline(cita);
  if (!deadline) return false;
  return deadline.getTime() < now.getTime();
}

export function isActiveCitaForCongestion(cita, now = new Date()) {
  if (!cita || cita.visita_validada_en) return false;
  const est = String(cita.estado || '').toLowerCase();
  if (est !== 'pendiente' && est !== 'confirmada' && est !== 'confirmado') {
    return false;
  }
  if (isCitaPastNoShowWindow(cita, now)) return false;
  return true;
}

export function isSlotCongested(count) {
  return Number(count) >= CITA_CONGESTION_THRESHOLD;
}

/**
 * Mapa { "08:00": { count, congested } } para un día y sucursal.
 * @param {Array<object>} citas
 * @param {string|Date} date
 * @param {string|null} sucursalId
 * @param {{ matrizId?: string|null, rama?: string|null, categoria?: string|null, servicioLookup?: Map<string,string>|null }} [options]
 */
export function buildSlotDensityMap(
  citas,
  date,
  sucursalId,
  { matrizId = null, rama = null, categoria = null, servicioLookup = null } = {},
) {
  const filterCategoria = categoria || rama || null;
  const dateKey =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : localCalendarDateString(date instanceof Date ? date : new Date(date));

  const rows = filterRowsBySucursal(citas || [], sucursalId, { matrizId });
  const map = {};

  for (const cita of rows) {
    if (!isActiveCitaForCongestion(cita)) continue;
    if (
      filterCategoria &&
      !citaMatchesCongestionCategoria(cita, filterCategoria, servicioLookup)
    ) {
      continue;
    }
    const citaDay = zonedCalendarDateString(cita.fecha_hora);
    if (citaDay !== dateKey) continue;
    const slot =
      getSlotStartFromInstant(cita.fecha_hora) ||
      getSlotStart(cita.fecha_hora);
    if (!slot) continue;
    if (!map[slot]) map[slot] = { count: 0, congested: false };
    map[slot].count += 1;
    map[slot].congested = isSlotCongested(map[slot].count);
  }

  return map;
}

/** ¿La cita cae en una franja ya congestionada (incluyéndola en el conteo)? */
export function isCitaInCongestedSlot(
  cita,
  citas,
  sucursalId,
  { matrizId = null, servicioLookup = null } = {},
) {
  if (!cita?.fecha_hora) return false;
  const dateKey = zonedCalendarDateString(cita.fecha_hora);
  const categoria = resolveCitaCongestionCategoria(cita, servicioLookup);
  const map = buildSlotDensityMap(citas, dateKey, sucursalId, {
    matrizId,
    categoria,
    servicioLookup,
  });
  const slot =
    getSlotStartFromInstant(cita.fecha_hora) || getSlotStart(cita.fecha_hora);
  return Boolean(slot && map[slot]?.congested);
}
