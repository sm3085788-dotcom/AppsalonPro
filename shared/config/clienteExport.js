/** Texto / JSON de ficha cliente para compartir o imprimir. */
export function buildClienteExportPayload(cli) {
  if (!cli || typeof cli !== 'object') return null;
  return {
    id: cli.id ?? null,
    user_id: cli.user_id ?? null,
    nombre: cli.nombre ?? null,
    telefono: cli.telefono ?? null,
    email: cli.email ?? null,
    direccion: cli.direccion ?? null,
    cumpleanos: cli.cumpleanos ?? null,
    categoria: cli.categoria ?? null,
    puntos_fidelidad: cli.puntos_fidelidad ?? null,
    tipo_registro: cli.tipo_registro ?? null,
    notas: cli.notas ?? null,
    contacto_emergencia: cli.contacto_emergencia ?? null,
    tel_emergencia: cli.tel_emergencia ?? null,
    referido_por: cli.referido_por ?? null,
    photo_url: cli.photo_url ?? null,
    created_at: cli.created_at ?? null,
    updated_at: cli.updated_at ?? null,
    exported_at: new Date().toISOString(),
  };
}

export function buildClienteExportText(cli) {
  const p = buildClienteExportPayload(cli);
  if (!p) return '';
  const lines = [
    'FICHA DE CLIENTE — AppSalon',
    '========================',
    `Exportado: ${new Date().toLocaleString('es-GT')}`,
    '',
    `Nombre: ${p.nombre || '—'}`,
    `Teléfono: ${p.telefono || '—'}`,
    `Email: ${p.email || '—'}`,
    `Dirección: ${p.direccion || '—'}`,
    `Cumpleaños: ${p.cumpleanos || '—'}`,
    `Categoría: ${p.categoria || '—'}`,
    `Puntos fidelidad: ${p.puntos_fidelidad ?? '—'}`,
    `Origen: ${p.tipo_registro || '—'}`,
    `Foto (URL): ${p.photo_url || '—'}`,
    `ID cliente: ${p.id || '—'}`,
    `ID usuario auth: ${p.user_id || '—'}`,
    '',
    p.notas ? `Notas: ${p.notas}` : null,
    p.contacto_emergencia ? `Emergencia: ${p.contacto_emergencia} · ${p.tel_emergencia || ''}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

export function buildClienteExportJson(cli) {
  return JSON.stringify(buildClienteExportPayload(cli), null, 2);
}
