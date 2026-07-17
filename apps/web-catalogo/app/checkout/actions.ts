'use server';

import { getCurrentUser } from '@/lib/auth';
import { getOrderReceiptForUser, type OrderReceipt } from '@/lib/orders/orderReceipt';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export async function getOrderReceiptAction(
  orderId: string,
): Promise<{ receipt: OrderReceipt | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { receipt: null, error: 'Catálogo no conectado.' };
  }
  const user = await getCurrentUser();
  if (!user) return { receipt: null, error: 'No autenticado.' };

  try {
    const supabase = await createSupabaseServerClient();
    const receipt = await getOrderReceiptForUser(supabase, user.id, orderId);
    if (!receipt) return { receipt: null, error: 'Pedido no encontrado.' };
    return { receipt, error: null };
  } catch {
    return { receipt: null, error: 'No se pudo cargar el comprobante.' };
  }
}
