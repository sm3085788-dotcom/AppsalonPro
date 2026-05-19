import { membresiaLabel } from './membresias.js';

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
    membresia_nivel: cli.membresia_nivel ?? null,
    membresia_activada_en: cli.membresia_activada_en ?? null,
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
    `Membresía: ${p.membresia_nivel ? membresiaLabel(p.membresia_nivel) || p.membresia_nivel : 'Sin activar'}`,
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

/** HTML para PDF imprimible (App Salón). */
export function buildClienteFichaHtml(cli, { photoDataUrl = null } = {}) {
  const p = buildClienteExportPayload(cli);
  if (!p) return '<html><body><p>Sin datos</p></body></html>';
  const memb = p.membresia_nivel ? membresiaLabel(p.membresia_nivel) || p.membresia_nivel : 'Sin activar';
  const fotoBlock = photoDataUrl
    ? `<div class="photo"><img src="${photoDataUrl}" alt="Foto"/></div>`
    : '<p class="muted">Sin foto de perfil</p>';
  const rows = [
    ['Nombre', p.nombre],
    ['Teléfono', p.telefono],
    ['Email', p.email],
    ['Dirección', p.direccion],
    ['Cumpleaños', p.cumpleanos],
    ['Membresía', memb],
    ['Categoría', p.categoria],
    ['Puntos', p.puntos_fidelidad],
    ['Origen', p.tipo_registro],
    ['ID cliente', p.id],
  ]
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(
      ([k, v]) =>
        `<tr><th>${escHtml(k)}</th><td>${escHtml(String(v))}</td></tr>`,
    )
    .join('');
  const notas = p.notas
    ? `<div class="notes"><strong>Notas</strong><p>${escHtml(p.notas)}</p></div>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    body{font-family:system-ui,-apple-system,sans-serif;padding:20px;color:#1a1a1a;font-size:12px;max-width:720px;margin:0 auto}
    h1{font-size:20px;margin:0 0 4px;color:#111}
    .meta{font-size:10px;color:#666;margin-bottom:16px}
    .photo{text-align:center;margin:12px 0 16px}
    .photo img{max-width:160px;max-height:160px;border-radius:12px;border:1px solid #ddd;object-fit:cover}
    .muted{color:#888;font-size:11px;text-align:center}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th,td{border:1px solid #ddd;padding:8px 10px;text-align:left;vertical-align:top}
    th{width:32%;background:#f7f4ef;font-weight:600;font-size:11px}
    td{font-size:12px}
    .notes{margin-top:16px;padding:12px;background:#fafafa;border:1px solid #eee;border-radius:8px}
    .notes p{margin:6px 0 0;line-height:1.45}
  </style></head><body>
    <h1>${escHtml(p.nombre || 'Cliente')}</h1>
    <div class="meta">Ficha exportada · ${escHtml(new Date().toLocaleString('es-GT'))}</div>
    ${fotoBlock}
    <table><tbody>${rows}</tbody></table>
    ${notas}
  </body></html>`;
}
