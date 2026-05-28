const SALON_NOMBRE = "Andrea's salón";

export const CITA_COMPROMISO_NOTE =
  'Tu compromiso es importante para nosotros, valoramos y cuidamos tu tiempo. Llámanos o enviá un mensaje para saber de cualquier cambio 3 horas antes de tu cita.';

/** Segmentos para la tarjeta (negrita en frases clave). */
export const CITA_COMPROMISO_NOTE_SEGMENTS = [
  { t: 'Tu compromiso es importante para nosotros', bold: true },
  { t: ', ' },
  { t: 'valoramos y cuidamos tu tiempo', bold: true },
  { t: '. Llámanos o enviá un mensaje para saber de cualquier cambio ' },
  { t: '3 horas antes de tu cita', bold: true },
  { t: '.' },
];

export const CITA_UBICACION_HINT = 'Para ubicación: Perfil → Contactos.';

const OLD_NOTE_PREFIX = 'Cita confirmada por el salón';

function firstName(full) {
  const p = String(full || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return p[0] || 'Cliente';
}

function formatFecha(dt) {
  const d = dt instanceof Date ? dt : new Date(dt);
  return d.toLocaleDateString('es-GT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatHora(dt) {
  const d = dt instanceof Date ? dt : new Date(dt);
  return d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}

function formatPrecio(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return null;
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Payload estructurado para tarjeta luxury en Andreas Pro (App Clientes).
 */
export function buildCitaConfirmacionPayload(p) {
  const nombre = String(p?.clienteNombre || 'Cliente').trim() || 'Cliente';
  const servicio = String(p?.servicio || 'Cita en salón').trim();
  const dt = p?.fechaHora instanceof Date ? p.fechaHora : new Date(p?.fechaHora || Date.now());
  const confirmada = String(p?.estado || 'pendiente').toLowerCase() === 'confirmado';
  const prof = String(p?.profesionalNombre || '').trim();
  const precio = formatPrecio(p?.precio);

  const payload = {
    __citaCard: true,
    version: 1,
    confirmada,
    greeting: `Hola ${firstName(nombre)},`,
    headline: confirmada ? 'Tu cita está confirmada' : 'Recibimos tu solicitud',
    salon: SALON_NOMBRE,
    servicio,
    fecha: formatFecha(dt),
    hora: formatHora(dt),
    note: CITA_COMPROMISO_NOTE,
    ubicacion: CITA_UBICACION_HINT,
  };
  if (prof) payload.profesional = prof;
  if (precio) payload.precio = precio;
  return JSON.stringify(payload);
}

export function parseCitaConfirmacionContent(raw) {
  const text = String(raw || '').trim();
  if (!text.startsWith('{')) return null;
  try {
    const o = JSON.parse(text);
    if (!o || o.__citaCard !== true) return null;
    return o;
  } catch {
    return null;
  }
}

function isDefaultCompromisoNote(n) {
  const s = String(n || '').trim();
  if (!s || s.startsWith(OLD_NOTE_PREFIX)) return true;
  if (s.startsWith('Tu compromiso')) return true;
  return false;
}

export function resolveCitaConfirmacionNote(card) {
  const n = String(card?.note || '').trim();
  if (isDefaultCompromisoNote(n)) return CITA_COMPROMISO_NOTE;
  return n;
}

export function resolveCitaConfirmacionNoteSegments(card) {
  const n = String(card?.note || '').trim();
  if (isDefaultCompromisoNote(n)) return CITA_COMPROMISO_NOTE_SEGMENTS;
  return [{ t: n }];
}

export function resolveCitaConfirmacionUbicacion(card) {
  if (card?.ubicacion) return String(card.ubicacion).trim();
  const footer = String(card?.footer || '').trim();
  if (!footer) return CITA_UBICACION_HINT;
  const low = footer.toLowerCase();
  const cambiosIdx = low.indexOf('para cambios');
  if (cambiosIdx > 0) {
    return footer.slice(0, cambiosIdx).trim().replace(/\s*\.\s*$/, '.');
  }
  if (/ubicaci[oó]n/i.test(footer)) {
    const m = footer.match(/Para ubicaci[oó]n[^.]*\.?/i);
    return m ? m[0].trim() : CITA_UBICACION_HINT;
  }
  return CITA_UBICACION_HINT;
}

/** Texto plano para vista previa en bandeja del salón. */
export function citaConfirmacionPreviewText(raw) {
  const card = parseCitaConfirmacionContent(raw);
  if (!card) return String(raw || '').trim().slice(0, 120);
  return card.headline || 'Confirmación de cita';
}
