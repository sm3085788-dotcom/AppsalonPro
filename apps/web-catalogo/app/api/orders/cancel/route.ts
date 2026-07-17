import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

interface CancelOrderBody {
  orderId?: string;
  reason?: string;
}

function rpcErrorMessage(err: { message?: string }): string {
  const msg = String(err.message || '');
  if (msg.includes('Pedido no encontrado')) return 'Pedido no encontrado.';
  if (msg.includes('No autorizado')) return 'No tenés permiso para cancelar este pedido.';
  if (msg.includes('no se puede cancelar')) return 'Este pedido ya no se puede cancelar.';
  return msg || 'No se pudo cancelar el pedido.';
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Catálogo no conectado.' }, { status: 503 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const body = (await request.json()) as CancelOrderBody;
    const orderId = String(body.orderId || '').trim();
    if (!orderId) {
      return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    }

    const reason = String(body.reason || 'Cancelado por el cliente').trim().slice(0, 240);

    const { data, error } = await supabase.rpc('client_cancel_pedido', {
      p_order_id: orderId,
      p_reason: reason,
    });

    if (error) {
      const message = rpcErrorMessage(error);
      const status = message.includes('no encontrado')
        ? 404
        : message.includes('permiso')
          ? 403
          : 400;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ ok: true, order: data });
  } catch (err) {
    console.error('[orders/cancel]', err);
    return NextResponse.json({ error: 'No se pudo cancelar el pedido.' }, { status: 500 });
  }
}
