import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatMetaQ, progresoMetaPct } from '../../../shared/config/metaGlobal.js';
import { addReporte } from './salonReportesStorage';

const KEY = '@salon/meta_periodos_archivados_v1';
const RENEWAL_ALERT_KEY = '@salon/meta_renovacion_alertada_v1';

function toStartIso(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function toEndIso(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

async function loadArchivados() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function markArchivado(metaId, fechaFin) {
  const list = await loadArchivados();
  const token = `${metaId}:${fechaFin}`;
  if (!list.includes(token)) {
    list.push(token);
    await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(-120)));
  }
}

/** Si el período de la meta ya terminó, guarda reporte en Reportes (teléfono). */
export async function maybeArchivarMetaVencida(meta) {
  if (!meta?.id || !meta?.fecha_fin) return false;
  const fin = new Date(meta.fecha_fin);
  fin.setHours(23, 59, 59, 999);
  if (Date.now() <= fin.getTime()) return false;

  const token = `${meta.id}:${meta.fecha_fin}`;
  const archivados = await loadArchivados();
  if (archivados.includes(token)) return false;

  const pct = progresoMetaPct(meta);
  const inicio = meta.fecha_inicio || meta.fecha_fin;
  const item = {
    id: `meta-cierre-${meta.id}-${Date.now()}`,
    typeId: 'metas',
    typeLabel: 'Meta global (cierre período)',
    fromIso: toStartIso(inicio),
    toIso: toEndIso(meta.fecha_fin),
    total: 1,
    rows: [
      {
        nombre: meta.titulo || 'Meta global',
        descripcion: `Período ${inicio} → ${meta.fecha_fin}`,
        monto: Number(meta.actual || 0),
        montoFmt: `${formatMetaQ(meta.actual)} / ${formatMetaQ(meta.valor_objetivo)} (${pct}%)`,
        fecha: meta.fecha_fin,
      },
    ],
    summary: `Cierre: ${formatMetaQ(meta.actual)} de ${formatMetaQ(meta.valor_objetivo)} · ${pct}%`,
    generatedAt: new Date().toISOString(),
    status: 'Cierre automático',
  };

  await addReporte(item);
  await markArchivado(meta.id, meta.fecha_fin);
  return true;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** El período ya terminó (después del último día de fecha_fin). */
export function metaPeriodoTerminado(meta, at = new Date()) {
  if (!meta?.fecha_fin) return false;
  return at.getTime() > endOfDay(meta.fecha_fin).getTime();
}

/** Hoy es el último día del período (fecha_fin). */
export function metaVenceHoy(meta, at = new Date()) {
  if (!meta?.fecha_fin) return false;
  return startOfDay(meta.fecha_fin).getTime() === startOfDay(at).getTime();
}

/** Sugiere el período siguiente con la misma duración que el anterior. */
export function suggestNextPeriod(fechaInicio, fechaFin) {
  const ini = fechaInicio ? new Date(fechaInicio) : startOfDay(new Date());
  const fin = fechaFin ? new Date(fechaFin) : new Date(ini);
  const durationMs = Math.max(24 * 60 * 60 * 1000, endOfDay(fin).getTime() - startOfDay(ini).getTime());
  const nextIni = startOfDay(fin);
  nextIni.setDate(nextIni.getDate() + 1);
  const nextFin = new Date(nextIni.getTime() + durationMs);
  return { fechaInicio: nextIni, fechaFin: nextFin };
}

async function loadRenewalAlerts() {
  try {
    const raw = await AsyncStorage.getItem(RENEWAL_ALERT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function renewalToken(meta) {
  return `${meta?.id}:${meta?.fecha_fin}`;
}

async function markRenewalAlertShown(meta) {
  if (!meta?.id || !meta?.fecha_fin) return;
  const list = await loadRenewalAlerts();
  const token = renewalToken(meta);
  if (!list.includes(token)) {
    list.push(token);
    await AsyncStorage.setItem(RENEWAL_ALERT_KEY, JSON.stringify(list.slice(-120)));
  }
}

/**
 * Determina si debe mostrarse alerta de renovación (una vez por período).
 * @returns {{ show: boolean, reason: 'expired'|'due_today'|null, suggested: { fechaInicio: Date, fechaFin: Date }|null }}
 */
export async function getMetaRenewalPrompt(meta) {
  if (!meta?.id || !meta?.fecha_fin || !meta?.activo) {
    return { show: false, reason: null, suggested: null };
  }

  const expired = metaPeriodoTerminado(meta);
  const dueToday = metaVenceHoy(meta);
  if (!expired && !dueToday) {
    return { show: false, reason: null, suggested: null };
  }

  const token = renewalToken(meta);
  const shown = (await loadRenewalAlerts()).includes(token);
  if (shown) {
    return { show: false, reason: null, suggested: suggestNextPeriod(meta.fecha_inicio, meta.fecha_fin) };
  }

  return {
    show: true,
    reason: expired ? 'expired' : 'due_today',
    suggested: suggestNextPeriod(meta.fecha_inicio, meta.fecha_fin),
  };
}

export async function dismissMetaRenewalPrompt(meta) {
  await markRenewalAlertShown(meta);
}
