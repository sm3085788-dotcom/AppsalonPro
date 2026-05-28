/** Normaliza estado de cita desde BD (salón / clientes). */
export function normalizeEstadoCita(estado) {
  return String(estado || '').trim().toLowerCase();
}

export function labelEstadoCita(estado) {
  const s = normalizeEstadoCita(estado);
  if (s === 'confirmado') return 'Confirmada';
  if (s === 'pendiente') return 'Pendiente en espera de confirmación';
  if (s === 'rechazado' || s === 'rechazada' || s === 'cancelado' || s === 'cancelada') return 'Rechazada';
  if (s === 'completado' || s === 'completada') return 'Completada';
  return s ? String(estado) : 'Sin estado';
}

/** Verde = confirmada/completada, amarillo = pendiente, rojo = cancelada/rechazada. */
export function estadoCitaTone(estado) {
  const s = normalizeEstadoCita(estado);
  if (s === 'confirmado' || s === 'completado' || s === 'completada') {
    return { bg: 'rgba(76, 175, 80, 0.2)', fg: '#2E7D32' };
  }
  if (s === 'pendiente') {
    return { bg: 'rgba(255, 193, 7, 0.22)', fg: '#C49000' };
  }
  if (s === 'rechazado' || s === 'rechazada' || s === 'cancelado' || s === 'cancelada') {
    return { bg: 'rgba(244, 67, 54, 0.16)', fg: '#C62828' };
  }
  return { bg: 'rgba(158, 158, 158, 0.16)', fg: '#616161' };
}

/** Solo citas pendientes: el salón aún no las confirmó. */
export function clientePuedeModificarCita(estado) {
  return normalizeEstadoCita(estado) === 'pendiente';
}

export function clientePuedeCancelarCita(estado) {
  return clientePuedeModificarCita(estado);
}

export function clientePuedeReprogramarCita(estado) {
  return clientePuedeModificarCita(estado);
}

export function citaEstaConfirmada(estado) {
  return normalizeEstadoCita(estado) === 'confirmado';
}

export function citaEstaCancelada(estado) {
  const s = normalizeEstadoCita(estado);
  return s === 'cancelada' || s === 'cancelado' || s === 'rechazada' || s === 'rechazado';
}

const CITA_PASADA_MS = 60_000;

export function citaEsPasada(fechaHora, nowMs = Date.now()) {
  return new Date(fechaHora).getTime() < nowMs - CITA_PASADA_MS;
}

/**
 * Próxima = la cita activa más cercana en el futuro.
 * Otras próximas = resto de futuras activas (visibles en historial).
 */
export function partitionCitasCliente(rows) {
  const now = Date.now();
  const list = Array.isArray(rows) ? [...rows] : [];
  const byAsc = (a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime();
  const byDesc = (a, b) => -byAsc(a, b);

  const upcomingActivas = list
    .filter((c) => !citaEstaCancelada(c.estado) && !citaEsPasada(c.fecha_hora, now))
    .sort(byAsc);

  const proximaCita = upcomingActivas[0] || null;
  const otrasProximas = upcomingActivas.slice(1);

  const canceladasRechazadas = list.filter((c) => citaEstaCancelada(c.estado)).sort(byDesc);

  const pasadas = list
    .filter((c) => !citaEstaCancelada(c.estado) && citaEsPasada(c.fecha_hora, now))
    .sort(byDesc);

  return {
    proximaCita,
    otrasProximas,
    pasadas,
    canceladasRechazadas,
    todas: [...list].sort(byDesc),
  };
}
