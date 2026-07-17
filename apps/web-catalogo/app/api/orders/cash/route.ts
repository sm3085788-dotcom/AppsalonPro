import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensureClienteFromAuth } from '@/lib/data/cliente';
import { displayNameFromUser } from '@/lib/clientDisplayName';
import { createWebCashOrder } from '@/lib/orders/createWebCashOrder';
import { isSupabaseConfigured } from '@/lib/env';
import type { ProductFulfillmentChoice, UUID } from '@/lib/types/db';

interface CashOrderBody {
  sucursalId?: UUID;
  items?: Array<{ inventarioId: UUID; cantidad: number }>;
  fulfillment?: ProductFulfillmentChoice;
  customer?: {
    nombre?: string;
    telefono?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Catálogo no conectado a Supabase.' }, { status: 503 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const body = (await request.json()) as CashOrderBody;
    const fulfillment = body.fulfillment === 'domicilio' ? 'domicilio' : 'retiro_salon';
    if (fulfillment !== 'retiro_salon') {
      return NextResponse.json(
        { error: 'El pago en efectivo solo está disponible para retiro en salón.' },
        { status: 400 },
      );
    }

    const nombreFromBody = String(body.customer?.nombre || '').trim();
    const telefonoFromBody = String(body.customer?.telefono || '').trim();

    let nombre = nombreFromBody;
    let telefono = telefonoFromBody;

    if (nombre.length < 2 || telefono.length < 6) {
      const { row } = await ensureClienteFromAuth(supabase, user);
      if (!nombre || nombre.length < 2) {
        nombre =
          String(row?.nombre || '').trim() || displayNameFromUser(user) || 'Cliente web';
      }
      if (!telefono || telefono.length < 6) {
        telefono =
          String(row?.telefono || user.phone || '').trim() ||
          String((user.user_metadata as Record<string, unknown> | undefined)?.telefono || '').trim();
      }
    }

    if (nombre.length < 2 || telefono.replace(/\D/g, '').length < 8) {
      return NextResponse.json(
        { error: 'Completá tu nombre y teléfono en Mi cuenta antes de confirmar el pedido.' },
        { status: 400 },
      );
    }

    const result = await createWebCashOrder(supabase, user, {
      sucursalId: body.sucursalId ?? null,
      items: body.items ?? [],
      nombre,
      telefono,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      trackingCode: result.trackingCode,
      total: result.total,
    });
  } catch (err) {
    console.error('[orders/cash]', err);
    return NextResponse.json({ error: 'No se pudo registrar el pedido.' }, { status: 500 });
  }
}
