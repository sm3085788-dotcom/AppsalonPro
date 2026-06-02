export const TIENDA_JSON_MARK = '\n\n__TIENDA_UI_JSON__\n';

export const VOLUMEN_TRABAJO_OPCIONES = [
  { id: 'corto', label: 'Corto' },
  { id: 'medio', label: 'Medio' },
  { id: 'largo', label: 'Largo' },
  { id: 'muy_largo', label: 'Muy largo' },
];

export const DEFAULT_TIENDA_META = {
  badge: '',
  /** Línea bajo precio/estrellas en tarjeta Mis citas (App Clientes). */
  hintTarjeta: '',
  shippingLabel: 'Envío y retiro · coordinar en recepción',
  rating: 4.5,
  reviewCount: 0,
  /** Precio “antes” en tienda (opcional). Si no hay, se simula o se usa costo mayor al de venta. */
  precioRegular: null,
  articuloTipo: 'producto',
  /** Texto libre en inventario (ej. «1 hora», «media mañana»). */
  duracion_agenda: '',
  /** Minutos derivados para agenda / citas. */
  duracion_minutos: 60,
  /** Solo App Salón: volumen de cabello/trabajo (no se muestra en App Clientes). */
  volumenTrabajoActivo: false,
  volumenTrabajo: null,
  /** Precios GTQ por nivel cuando volumenTrabajoActivo (solo salón / Vender). */
  preciosPorVolumen: null,
};

export function emptyPreciosPorVolumen() {
  return { corto: null, medio: null, largo: null, muy_largo: null };
}

export function normalizePreciosPorVolumen(raw) {
  const out = emptyPreciosPorVolumen();
  if (!raw || typeof raw !== 'object') return out;
  for (const o of VOLUMEN_TRABAJO_OPCIONES) {
    const n = Number(raw[o.id]);
    out[o.id] = Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
  }
  return out;
}

/** Servicio con tabla de precios por volumen (App Salón). */
export function servicioUsaPreciosPorVolumen(row) {
  const { meta } = splitNotas(row?.notas);
  if (meta.articuloTipo !== 'servicio' || !meta.volumenTrabajoActivo) return false;
  const p = normalizePreciosPorVolumen(meta.preciosPorVolumen);
  return VOLUMEN_TRABAJO_OPCIONES.some((o) => p[o.id] != null && p[o.id] > 0);
}

export function getPreciosPorVolumenFromRow(row, precioVentaFallback = 0) {
  const { meta } = splitNotas(row?.notas);
  const pv = Number(row?.precio_venta ?? precioVentaFallback) || 0;
  let p = normalizePreciosPorVolumen(meta.preciosPorVolumen);
  if (meta.volumenTrabajoActivo) {
    for (const o of VOLUMEN_TRABAJO_OPCIONES) {
      if (p[o.id] == null || p[o.id] <= 0) p[o.id] = pv > 0 ? pv : null;
    }
  }
  return p;
}

export function precioServicioPorVolumen(row, volumenId) {
  const p = getPreciosPorVolumenFromRow(row);
  const id = VOLUMEN_TRABAJO_OPCIONES.some((o) => o.id === volumenId) ? volumenId : 'medio';
  return p[id] ?? (Number(row?.precio_venta) || 0);
}

function formatQInventario(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Precio regular para estrategia “antes / ahora” en tarjetas de tienda.
 * Prioridad: meta.precioRegular → precio_costo (si mayor) → simulado (+20 % redondeado).
 */
export function resolvePrecioRegularTienda(row, precioVenta) {
  const venta = Number(precioVenta);
  if (!Number.isFinite(venta) || venta <= 0) return null;
  const { meta } = splitNotas(row?.notas);
  const manual = Number(meta.precioRegular);
  if (Number.isFinite(manual) && manual > venta) return manual;
  const costo = Number(row?.precio_costo ?? row?.costo ?? 0);
  if (Number.isFinite(costo) && costo > venta) return costo;
  const simulated = Math.ceil((venta * 1.2) / 10) * 10;
  return simulated > venta ? simulated : null;
}

/** Subtítulo para búsqueda global / listados (App Salón). */
export function inventarioSearchSubtitle(row) {
  if (!row) return '';
  const tipo = getArticuloTipo(row);
  const tipoLbl = tipo === 'servicio' ? 'Servicio' : 'Producto';
  const parts = [tipoLbl, row.categoria, row.barcode].filter(Boolean);

  if (servicioUsaPreciosPorVolumen(row)) {
    const tabla = getPreciosPorVolumenFromRow(row);
    const vals = VOLUMEN_TRABAJO_OPCIONES.map((o) => tabla[o.id]).filter((n) => n != null && n > 0);
    if (vals.length) {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      parts.push(min === max ? formatQInventario(min) : `${formatQInventario(min)} – ${formatQInventario(max)}`);
    }
    parts.push('4 precios · volumen');
    return parts.join(' · ');
  }

  const pv = Number(row.precio_venta);
  if (pv > 0) parts.push(formatQInventario(pv));
  if (row.visible_en_tienda) parts.push('En tienda clientes');
  return parts.join(' · ');
}

/** Precio referencia en columna inventario (medio o único precio). */
export function precioVentaReferencia(meta, precioVentaColumn) {
  const pv = Number(precioVentaColumn) || 0;
  if (!meta?.volumenTrabajoActivo) return pv;
  const p = normalizePreciosPorVolumen(meta.preciosPorVolumen);
  if (p.medio != null && p.medio > 0) return p.medio;
  const first = VOLUMEN_TRABAJO_OPCIONES.map((o) => p[o.id]).find((n) => n != null && n > 0);
  return first ?? pv;
}

export function volumenTrabajoLabel(id) {
  const opt = VOLUMEN_TRABAJO_OPCIONES.find((o) => o.id === id);
  return opt ? opt.label : null;
}

/** Extrae minutos desde texto libre o número guardado. */
export function parseDuracionMinutosFromMeta(meta) {
  const text = String(meta?.duracion_agenda ?? '').trim();
  if (text) {
    const m = text.match(/(\d+)/);
    if (m) return Math.max(15, parseInt(m[1], 10));
  }
  const n = Number(meta?.duracion_minutos);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_TIENDA_META.duracion_minutos;
}

function normalizeVolumenMeta(meta) {
  if (meta.articuloTipo !== 'servicio') {
    meta.volumenTrabajoActivo = false;
    meta.volumenTrabajo = null;
    meta.preciosPorVolumen = null;
    return meta;
  }
  meta.volumenTrabajoActivo = !!meta.volumenTrabajoActivo;
  const valid = VOLUMEN_TRABAJO_OPCIONES.some((o) => o.id === meta.volumenTrabajo);
  if (!meta.volumenTrabajoActivo) {
    meta.volumenTrabajo = null;
    meta.preciosPorVolumen = null;
  } else {
    meta.volumenTrabajo = null;
    meta.preciosPorVolumen = normalizePreciosPorVolumen(meta.preciosPorVolumen);
  }
  return meta;
}

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
  meta.duracion_agenda = String(meta.duracion_agenda ?? '').trim();
  if (!meta.duracion_agenda) {
    const dur = Number(meta.duracion_minutos);
    if (Number.isFinite(dur) && dur > 0) meta.duracion_agenda = `${Math.floor(dur)} min`;
  }
  meta.duracion_minutos = parseDuracionMinutosFromMeta(meta);
  normalizeVolumenMeta(meta);
  return { staff, meta };
}

/** Tipo guardado explícitamente en el bloque JSON de inventario (sin aplicar default). */
export function explicitArticuloTipoFromNotas(raw) {
  const s = String(raw || '');
  const i = s.indexOf(TIENDA_JSON_MARK);
  if (i === -1) return null;
  try {
    const o = JSON.parse(s.slice(i + TIENDA_JSON_MARK.length).trim() || '{}');
    const t = o?.articuloTipo;
    return t === 'servicio' || t === 'producto' ? t : null;
  } catch {
    return null;
  }
}

/** Señales de servicio cuando el JSON no trae `articuloTipo` (filas legacy). */
function categoriaInventarioEsServicio(raw) {
  const t = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!t) return false;
  const known = [
    'manicure',
    'pedicure',
    'corte y peinado',
    'coloracion',
    'tratamientos capilares',
    'keratina / alisado',
    'facial / spa',
    'maquillaje',
    'cejas y pestanas',
    'barberia',
  ];
  if (known.includes(t)) return true;
  return /manicure|pedicure|keratina|peinado|coloraci|tratamiento|facial|maquillaje|cejas|pestanas|barber|alisado|pies/.test(
    t,
  );
}

export function inventarioRowLooksLikeServicio(row) {
  if (!row) return false;
  const { meta } = splitNotas(row.notas);
  if (meta.volumenTrabajoActivo) return true;
  if (String(meta.duracion_agenda || '').trim()) return true;
  if (servicioUsaPreciosPorVolumen(row)) return true;
  if (categoriaInventarioEsServicio(row.categoria)) return true;
  const nombre = String(row.nombre || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (nombre && !/\d+\s*%/.test(nombre)) {
    if (/^pies$|pedicure completo|manicure completo/.test(nombre)) return true;
    if (/keratina|alisado|coloracion|peinado/.test(nombre) && row.visible_en_tienda === false) {
      return true;
    }
  }
  const dm = Number(meta.duracion_minutos);
  if (Number.isFinite(dm) && dm > 0 && dm !== DEFAULT_TIENDA_META.duracion_minutos) {
    return true;
  }
  return false;
}

export function getArticuloTipo(row) {
  const explicit = explicitArticuloTipoFromNotas(row?.notas);
  if (explicit) return explicit;
  if (inventarioRowLooksLikeServicio(row)) return 'servicio';
  return 'producto';
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
  const precioVariable = servicioUsaPreciosPorVolumen(row);
  return {
    id: `inv-${row.id}`,
    inventarioId: row.id,
    nombre: String(row.nombre).trim(),
    precio: precioVariable ? null : Number(row.precio_venta) || 0,
    precioVariable,
    duracion_minutos:
      articuloTipo === 'servicio' ? meta.duracion_minutos || DEFAULT_TIENDA_META.duracion_minutos : 30,
    duracion_agenda: articuloTipo === 'servicio' ? meta.duracion_agenda || '' : '',
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
