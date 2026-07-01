import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  INVENTARIO_COLUMNS,
  isServicio,
  mapToProduct,
  mapToService,
} from '@/lib/inventario';
import type { InventarioRow, Product, Service, UUID } from '@/lib/types/db';

/* ── Datos demo de referencia ──────────────────────────────────────────────
 * Se muestran solo cuando no hay inventario en Supabase, para poder visualizar
 * las pantallas de servicios, productos y reserva sin datos reales cargados.
 * No alteran la lógica: si Supabase devuelve filas, estos se ignoran.
 */
const DEMO_SERVICES: Service[] = [
  {
    id: 'demo-servicio-lifting',
    nombre: 'Lifting de Pestañas Premium',
    categoria: 'Mirada',
    precio: 350,
    descripcion:
      'Realza la curvatura natural de tus pestañas con un tratamiento de larga duración. Incluye tinte y nutrición con queratina.',
    imagenUrl: '/images/service-lifting.png',
    duracionMin: 60,
    rating: 4.9,
    reviewCount: 128,
  },
];

const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-producto-serum',
    nombre: 'Sérum de Crecimiento de Pestañas',
    categoria: 'Cuidado',
    precio: 480,
    descripcion:
      'Fórmula profesional con péptidos y biotina que fortalece y estimula el crecimiento de pestañas y cejas en 6 semanas.',
    imagenUrl: '/images/product-serum.png',
    imagenesUrls: ['/images/product-serum.png'],
    stock: 12,
    enStock: true,
    rating: 4.8,
    reviewCount: 64,
  },
];

async function fetchInventario(): Promise<InventarioRow[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('inventario')
      .select(INVENTARIO_COLUMNS)
      .order('nombre');
    if (error || !data) return [];
    return data as unknown as InventarioRow[];
  } catch {
    return [];
  }
}

/** Stock por sucursal: mapa inventario_id -> stock_actual. */
async function fetchBranchStockMap(
  branchId: UUID | null,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!branchId || !isSupabaseConfigured) return map;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('inventario_stock_sucursal')
      .select('inventario_id,stock_actual')
      .eq('sucursal_id', branchId);
    if (error || !data) return map;
    for (const row of data as Array<{
      inventario_id: string;
      stock_actual: number | null;
    }>) {
      map.set(row.inventario_id, Number(row.stock_actual ?? 0));
    }
    return map;
  } catch {
    return map;
  }
}

/** Req 4: servicios publicados (inventario marcado como servicio). */
export async function getServices(): Promise<Service[]> {
  const rows = await fetchInventario();
  const services = rows.filter(isServicio).map(mapToService);
  if (services.length > 0) return services;
  // Sin Supabase conectado: vacío (no datos demo falsos en producción).
  if (!isSupabaseConfigured) return [];
  return DEMO_SERVICES;
}

/** Req 4: productos fisicos con validacion de stock por sucursal. */
export async function getProducts(branchId: UUID | null): Promise<Product[]> {
  const rows = await fetchInventario();
  const stockMap = await fetchBranchStockMap(branchId);
  const products = rows
    .filter((r) => !isServicio(r) && r.visible_en_tienda === true)
    .map((r) => mapToProduct(r, stockMap.get(r.id) ?? 0));
  if (products.length > 0) return products;
  if (!isSupabaseConfigured) return [];
  return DEMO_PRODUCTS;
}

export async function getProductById(
  id: UUID,
  branchId: UUID | null,
): Promise<Product | null> {
  const rows = await fetchInventario();
  const row = rows.find((r) => r.id === id);
  if (!row) {
    if (!isSupabaseConfigured) return null;
    return DEMO_PRODUCTS.find((p) => p.id === id) ?? null;
  }
  const stockMap = await fetchBranchStockMap(branchId);
  return mapToProduct(row, stockMap.get(row.id) ?? 0);
}

export async function getServiceById(id: UUID): Promise<Service | null> {
  const rows = await fetchInventario();
  const row = rows.find((r) => r.id === id);
  if (!row) {
    if (!isSupabaseConfigured) return null;
    return DEMO_SERVICES.find((s) => s.id === id) ?? null;
  }
  return mapToService(row);
}
