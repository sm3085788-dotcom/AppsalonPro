import { db } from './supabaseClient.js';
import { isClienteAppVerificado } from './clienteAppMeta.js';

export const INCIDENT_REPORT_CONTENT_TYPE = 'incident_report';

/** Texto del reporte para el cliente (App Clientes · Andreas Pro). */
export function buildIncidentClientMessage(dto) {
  const lines = [
    'Reporte del salón',
    '',
    `Folio: ${dto.folio || '—'}`,
    `Fecha: ${dto.fechaLegible || '—'}`,
    `Clasificación: ${dto.clasificacionLabel || '—'}`,
    '',
    `Lugar: ${dto.lugar || '—'}`,
    '',
    'Relato:',
    dto.relato || '—',
  ];
  if (dto.notas?.trim()) {
    lines.push('', 'Notas:', dto.notas.trim());
  }
  if (dto.aplicaReembolso || dto.aplicaCompensacion) {
    lines.push('', 'Seguimiento:');
    if (dto.aplicaReembolso) lines.push('• Evaluación de reembolso en curso.');
    if (dto.aplicaCompensacion) lines.push('• Compensación en servicio o retrabajo en evaluación.');
  }
  lines.push(
    '',
    'Si tenés dudas, respondé por este chat o contactá recepción.',
    '',
    '— Aura Salón',
  );
  return lines.join('\n');
}

/** Envía el reporte al cliente vía marketing_direct_messages (Andreas Pro). */
export async function sendIncidentReportToClient(client, dto, sender = {}) {
  if (!client?.id) {
    return { data: null, error: { message: 'Elegí un cliente de la lista.' } };
  }
  if (!isClienteAppVerificado(client)) {
    return {
      data: null,
      error: {
        message:
          'Este cliente es ficha manual sin App Clientes. Solo los clientes verificados en la app pueden recibir mensajes.',
      },
    };
  }
  const content = buildIncidentClientMessage(dto);
  return db.marketingDirectMessages.create({
    client_id: client.id,
    client_name: client.nombre,
    client_phone: client.telefono || null,
    content,
    content_type: INCIDENT_REPORT_CONTENT_TYPE,
    media_url: dto.imagen_url || null,
    media_kind: dto.imagen_url ? 'image' : null,
    status: 'pending_sync',
    created_by: sender.id || null,
    created_by_name: sender.name || 'Salón',
  });
}
