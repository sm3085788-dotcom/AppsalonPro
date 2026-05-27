const SALON_NOMBRE = "Andrea's salón";

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
    note: 'Cita confirmada por el salón. Te enviamos todos los detalles aquí; revisalos por favor.',
    footer: 'Para ubicación: Perfil → Contactos. Para cambios: pestaña Historial.',
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

/** Texto plano para vista previa en bandeja del salón. */
export function citaConfirmacionPreviewText(raw) {
  const card = parseCitaConfirmacionContent(raw);
  if (!card) return String(raw || '').trim().slice(0, 120);
  return card.note || card.headline || 'Confirmación de cita';
}
