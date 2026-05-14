export const TIENDA_JSON_MARK = '\n\n__TIENDA_UI_JSON__\n';

export const DEFAULT_TIENDA_META = {
  badge: '',
  shippingLabel: 'Envío y retiro · coordinar en recepción',
  rating: 4.5,
  reviewCount: 0,
  articuloTipo: 'producto',
  /** Minutos de agenda cuando articuloTipo === 'servicio'. */
  duracion_minutos: 60,
};

export function splitNotas(raw) {
  const s = String(raw || '');
  const i = s.indexOf(TIENDA_JSON_MARK);
  if (i === -1) return { staff: s.trim(), meta: { ...DEFAULT_TIENDA_META } };
  const staff = s.slice(0, i).trim();
  let meta = { ...DEFAULT_TIENDA_META };
  try {
    meta = { ...DEFAULT_TIENDA_META, ...JSON.parse(s.slice(i + TIENDA_JSON_MARK.length).trim() || '{}') };
  } catch {
    /* ignore */
  }
  if (meta.articuloTipo !== 'servicio' && meta.articuloTipo !== 'producto') meta.articuloTipo = 'producto';
  const dur = Number(meta.duracion_minutos);
  meta.duracion_minutos = Number.isFinite(dur) && dur > 0 ? Math.floor(dur) : DEFAULT_TIENDA_META.duracion_minutos;
  return { staff, meta };
}

export function getArticuloTipo(row) {
  const { meta } = splitNotas(row?.notas);
  return meta.articuloTipo === 'servicio' ? 'servicio' : 'producto';
}

export function mergeNotas(staff, meta) {
  const clean = String(staff || '').trim();
  return `${clean}${TIENDA_JSON_MARK}${JSON.stringify({ ...DEFAULT_TIENDA_META, ...meta })}`;
}

/** Fecha inventario AAAA-MM-DD o null (evita errores Postgres con valores sueltos). */
export function sanitizeInventarioFechaVencimiento(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return s;
}

/** Fila inventario → ítem de catálogo para agenda (producto o servicio). */
export function inventarioRowToAgendaItem(row) {
  if (!row?.nombre) return null;
  const articuloTipo = getArticuloTipo(row);
  const { meta } = splitNotas(row.notas);
  return {
    id: `inv-${row.id}`,
    inventarioId: row.id,
    nombre: String(row.nombre).trim(),
    precio: Number(row.precio_venta) || 0,
    duracion_minutos:
      articuloTipo === 'servicio' ? meta.duracion_minutos || DEFAULT_TIENDA_META.duracion_minutos : 30,
    articuloTipo,
    categoria: String(row.categoria || '').trim(),
    barcode: String(row.barcode || '').trim(),
    stock_actual: Math.max(0, Math.floor(Number(row.stock_actual) || 0)),
    source: 'inventario',
  };
}

/** Fila inventario (solo servicio) → sync tabla servicios. */
export function inventarioRowToAgendaServicio(row) {
  const item = inventarioRowToAgendaItem(row);
  if (!item || item.articuloTipo !== 'servicio') return null;
  return {
    id: row.id,
    nombre: item.nombre,
    precio: item.precio,
    duracion_minutos: item.duracion_minutos,
    source: 'inventario',
  };
}
