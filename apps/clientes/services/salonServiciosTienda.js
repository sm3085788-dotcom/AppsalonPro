import {
  db,
  getArticuloTipo,
  splitNotas,
  servicioUsaPreciosPorVolumen,
  parseDuracionMinutosFromMeta,
  mapInventarioToTiendaProduct,
} from '@appsalon/shared-config';
import { normalizeServicioCategoria } from '@appsalon/shared-config';

function normNombre(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

export function inventarioRowToServicioOption(row) {
  const { meta } = splitNotas(row?.notas);
  const precioVariable = servicioUsaPreciosPorVolumen(row);
  const precio = precioVariable ? 0 : Number(row.precio_venta) || 0;
  const mapped = mapInventarioToTiendaProduct(row);
  const fallbackUris = mapped?.imageUri ? [mapped.imageUri] : [];
  return {
    id: `inv-${row.id}`,
    inventarioId: row.id,
    nombre: row.nombre,
    categoria: normalizeServicioCategoria(row.categoria || mapped?.brandLine),
    precio,
    precioVariable,
    duracion_minutos: parseDuracionMinutosFromMeta(meta),
    duracion_agenda: String(meta.duracion_agenda || mapped?.duracionAgenda || '').trim(),
    imageUri: mapped?.imageUri || null,
    imageUris:
      Array.isArray(mapped?.imageUris) && mapped.imageUris.length
        ? mapped.imageUris
        : fallbackUris,
    priceLabel: mapped?.priceLabel || null,
    compareAtLabel: mapped?.compareAtLabel || null,
    badge: mapped?.badge || null,
    promocionVigente: Boolean(mapped?.promocionVigente),
    promocionHasta: mapped?.promocionHasta || null,
    rating: mapped?.rating ?? 4.5,
    reviewCount: mapped?.reviewCount ?? 0,
    stockHint: mapped?.stockHint || null,
    descripcion: mapped?.descripcion || '',
  };
}

/** Servicios de inventario (Mis citas) + catálogo legacy `servicios`. No usa tienda. */
export async function loadServiciosTiendaCatalog() {
  const [invRes, legRes] = await Promise.all([
    db.inventario.getCatalogoAppClientes(),
    db.servicios.search('', 120),
  ]);
  const invRows = !invRes.error && Array.isArray(invRes.data) ? invRes.data : [];
  const fromInv = invRows
    .filter((r) => getArticuloTipo(r) === 'servicio')
    .map(inventarioRowToServicioOption);
  const legRows = !legRes.error && Array.isArray(legRes.data) ? legRes.data : [];
  const fromLeg = legRows.map((s) => ({
    ...s,
    id: s.id != null ? `leg-${s.id}` : `leg-${normNombre(s.nombre)}`,
    categoria: normalizeServicioCategoria('Otro'),
    precioVariable: false,
    duracion_agenda: '',
    imageUri: null,
    priceLabel: Number(s.precio) > 0 ? `Q ${Number(s.precio).toFixed(2)}` : null,
  }));
  const merged = new Map();
  for (const s of fromInv) merged.set(normNombre(s.nombre), s);
  for (const s of fromLeg) {
    const k = normNombre(s.nombre);
    if (!merged.has(k)) merged.set(k, s);
  }
  return [...merged.values()].sort((a, b) =>
    String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'),
  );
}

export function formatServicioPrecio(s) {
  if (s.precioVariable || !(Number(s.precio) > 0)) {
    return s.priceLabel || 'Precio según volumen';
  }
  return `Q ${Number(s.precio).toLocaleString('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatServicioDuracion(s) {
  if (s.duracion_agenda?.trim()) return s.duracion_agenda.trim();
  const m = Number(s.duracion_minutos);
  return m > 0 ? `${m} min` : 'Duración a confirmar';
}
