import { db } from './supabaseClient.js';

export function metaVigente(meta, at = new Date()) {
  if (!meta?.activo) return false;
  const t = at.getTime();
  if (meta.fecha_inicio) {
    const ini = new Date(meta.fecha_inicio);
    ini.setHours(0, 0, 0, 0);
    if (t < ini.getTime()) return false;
  }
  if (meta.fecha_fin) {
    const fin = new Date(meta.fecha_fin);
    fin.setHours(23, 59, 59, 999);
    if (t > fin.getTime()) return false;
  }
  return true;
}

export async function getMetaGlobal() {
  return db.metas.getGlobalMontoActiva();
}

export async function guardarMetaGlobal({ valorObjetivo, titulo, fechaInicio, fechaFin }) {
  return db.metas.setMetaGlobalUnica({
    valor_objetivo: valorObjetivo,
    titulo: titulo || 'Meta global de ventas',
    fecha_inicio: fechaInicio || null,
    fecha_fin: fechaFin || null,
  });
}

/** Suma monto Q de una venta a la meta global activa (si existe y está en período). */
export async function registrarMontoVentaEnMeta(monto) {
  const delta = Number(monto);
  if (!Number.isFinite(delta) || delta <= 0) return { ok: true, skipped: true };
  const { data: meta, error } = await db.metas.getGlobalMontoActiva();
  if (error) return { ok: false, error };
  if (!meta) return { ok: true, skipped: true };
  if (!metaVigente(meta)) return { ok: true, skipped: true, fueraDePeriodo: true };
  const res = await db.metas.incrementarMonto(meta.id, delta);
  if (res.error) return { ok: false, error: res.error };
  return { ok: true, meta: res.data };
}

export function progresoMetaPct(meta) {
  return db.metas.getProgreso(meta);
}

export async function reiniciarMetaGlobal() {
  return db.metas.reiniciarProgresoGlobal();
}

function addThousandsSeparator(intDigits) {
  const digits = String(intDigits || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Interpreta monto con comas de miles y punto decimal. */
export function parseMontoInput(str) {
  const raw = String(str || '').trim().replace(/\s/g, '').replace(/^Q\s*/i, '');
  if (!raw) return NaN;
  const normalized = raw.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

/** Formatea al escribir: 500000 → 500,000 · 500000.5 → 500,000.5 */
export function formatMontoInputLive(value) {
  const raw = String(value ?? '');
  const str = raw.replace(/,/g, '').replace(/[^\d.]/g, '');
  const parts = str.split('.');
  const intPart = addThousandsSeparator(parts[0] || '');
  if (!parts.length || parts.length === 1) return intPart;
  const decPart = (parts[1] ?? '').slice(0, 2);
  if (raw.replace(/,/g, '').endsWith('.') && decPart === '') {
    return intPart ? `${intPart}.` : '0.';
  }
  return decPart !== '' ? `${intPart}.${decPart}` : intPart;
}

export function montoInputFromNumber(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '';
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const intFmt = addThousandsSeparator(intPart);
  if (decPart === '00') return intFmt;
  return `${intFmt}.${decPart}`;
}

export function formatMetaQ(amount) {
  const x = Number(amount || 0);
  if (!Number.isFinite(x)) return 'Q 0.00';
  const [intPart, decPart] = x.toFixed(2).split('.');
  return `Q ${addThousandsSeparator(intPart)}.${decPart}`;
}
