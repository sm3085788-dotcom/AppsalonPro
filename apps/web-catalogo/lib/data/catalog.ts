import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  INVENTARIO_COLUMNS,
  isServicio,
  mapToProduct,
  mapToService,
} from '@/lib/inventario';
import type { InventarioRow, Product, Service, UUID } from '@/lib/types/db';

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
  return rows.filter(isServicio).map(mapToService);
}

/** Req 4: productos fisicos con validacion de stock por sucursal. */
export async function getProducts(branchId: UUID | null): Promise<Product[]> {
  const rows = await fetchInventario();
  const stockMap = await fetchBranchStockMap(branchId);
  return rows
    .filter((r) => !isServicio(r) && r.visible_en_tienda === true)
    .map((r) => mapToProduct(r, stockMap.get(r.id) ?? 0));
}

export async function getProductById(
  id: UUID,
  branchId: UUID | null,
): Promise<Product | null> {
  const rows = await fetchInventario();
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  const stockMap = await fetchBranchStockMap(branchId);
  return mapToProduct(row, stockMap.get(row.id) ?? 0);
}

export async function getServiceById(id: UUID): Promise<Service | null> {
  const rows = await fetchInventario();
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  return mapToService(row);
}
