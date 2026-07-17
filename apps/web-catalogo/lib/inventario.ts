import type { InventarioRow, Product, Service } from '@/lib/types/db';
import {
  maybeRevertInventarioPromoExpired,
  resolvePrecioRegularTienda,
  servicioUsaPreciosPorVolumen,
} from '../../../shared/config/inventarioMeta.js';
import { mapInventarioToTiendaProduct } from '../../../shared/config/tiendaProductMap.js';
import { TIENDA_WEB_PICKUP_LABEL } from '@/lib/tiendaPickup';

/** Marca que el salon usa dentro de `inventario.notas` para anexar metadatos JSON de tienda. */
const TIENDA_JSON_MARK = '__TIENDA_UI_JSON__';

export interface InventarioMeta {
  rating: number | null;
  reviewCount: number;
  articuloTipo: string | null;
  duracionMin: number | null;
  descripcion: string | null;
  image: string | null;
  raw: Record<string, unknown>;
}

/** Extrae el bloque JSON de metadatos de `notas` sin romper si viene vacio o invalido. */
export function parseInventarioMeta(notas: string | null): InventarioMeta {
  const empty: InventarioMeta = {
    rating: null,
    reviewCount: 0,
    articuloTipo: null,
    duracionMin: null,
    descripcion: null,
    image: null,
    raw: {},
  };
  if (!notas) return empty;

  const idx = notas.indexOf(TIENDA_JSON_MARK);
  if (idx === -1) {
    // Sin bloque JSON: detectar tipo por texto plano.
    const isServicio = notas.includes('"articuloTipo":"servicio"') ||
      notas.includes('"articuloTipo": "servicio"');
    return { ...empty, articuloTipo: isServicio ? 'servicio' : null };
  }

  const jsonPart = notas.slice(idx + TIENDA_JSON_MARK.length).trim();
  try {
    const raw = JSON.parse(jsonPart) as Record<string, unknown>;
    const num = (v: unknown): number | null =>
      typeof v === 'number' && Number.isFinite(v) ? v : null;
    return {
      rating: num(raw.rating),
      reviewCount: num(raw.reviewCount) ?? 0,
      articuloTipo:
        typeof raw.articuloTipo === 'string' ? raw.articuloTipo : null,
      duracionMin: num(raw.duracionMin) ?? num(raw.duracion),
      descripcion:
        typeof raw.descripcion === 'string' ? raw.descripcion : null,
      image: typeof raw.image === 'string' ? raw.image : null,
      raw,
    };
  } catch {
    return empty;
  }
}

export function isServicio(row: InventarioRow): boolean {
  return parseInventarioMeta(row.notas).articuloTipo === 'servicio';
}

function firstImage(row: InventarioRow, metaImage: string | null): string | null {
  if (row.imagen_url) return row.imagen_url;
  if (Array.isArray(row.imagenes_urls) && row.imagenes_urls.length > 0) {
    return row.imagenes_urls[0];
  }
  return metaImage;
}

export function mapToService(row: InventarioRow): Service {
  const meta = parseInventarioMeta(row.notas);
  const precioVariable = servicioUsaPreciosPorVolumen(row);
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    precio: Number(row.precio_venta ?? 0),
    precioVariable,
    descripcion: row.descripcion_tienda ?? meta.descripcion,
    imagenUrl: firstImage(row, meta.image),
    duracionMin: meta.duracionMin,
    rating: meta.rating,
    reviewCount: meta.reviewCount,
  };
}

/** Proyecta inventario + stock sucursal al tipo Product web (misma lógica que App Clientes). */
export function mapToProductFromTienda(row: InventarioRow, stock: number): Product {
  const fresh = maybeRevertInventarioPromoExpired(row);
  const meta = parseInventarioMeta(fresh.notas);
  const tienda = mapInventarioToTiendaProduct({ ...fresh, stock_actual: stock });
  const precioVariable = tienda?.precioVariable ?? false;
  const priceAmount = tienda?.priceAmount;
  const precio =
    !precioVariable && priceAmount != null && Number.isFinite(priceAmount)
      ? Number(priceAmount)
      : 0;
  const compareAtRaw =
    !precioVariable && precio > 0 ? resolvePrecioRegularTienda(fresh, precio) : null;
  const compareAt =
    compareAtRaw != null && Number.isFinite(compareAtRaw) && compareAtRaw > precio
      ? compareAtRaw
      : null;
  const articuloTipo = tienda?.articuloTipo ?? 'producto';
  const stockHint =
    articuloTipo === 'servicio'
      ? tienda?.stockHint ?? null
      : stock > 0
        ? `En stock · ${stock} u.`
        : 'Sin stock';

  return {
    id: fresh.id,
    nombre: fresh.nombre,
    categoria: fresh.categoria,
    precio,
    compareAt,
    priceLabel: tienda?.priceLabel ?? null,
    promoBadge: tienda?.badge ?? null,
    promoVigente: Boolean(tienda?.promocionVigente),
    brandLine: tienda?.brandLine ? String(tienda.brandLine).toUpperCase() : null,
    shippingLabel: TIENDA_WEB_PICKUP_LABEL,
    stockHint,
    precioVariable,
    descripcion: fresh.descripcion_tienda ?? meta.descripcion,
    imagenUrl: firstImage(fresh, meta.image),
    imagenesUrls: Array.isArray(fresh.imagenes_urls) ? fresh.imagenes_urls : [],
    stock,
    enStock: stock > 0,
    rating: meta.rating,
    reviewCount: meta.reviewCount,
  };
}

export function mapToProduct(row: InventarioRow, stock: number): Product {
  return mapToProductFromTienda(row, stock);
}

/** Columnas que pedimos a `inventario` (evita traer toda la fila). */
export const INVENTARIO_COLUMNS =
  'id,nombre,categoria,precio_venta,precio_costo,stock_actual,stock_minimo,imagen_url,imagenes_urls,descripcion_tienda,visible_en_tienda,barcode,notas';
