import { NextResponse, type NextRequest } from 'next/server';
import { resolveDeliveryProvider } from '@/lib/delivery/provider';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { DeliveryAddress } from '@/lib/types/db';

/** Req 6: crea el envio de ultima milla para un pedido de productos. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      quoteId?: string;
      origin?: { direccion?: string; latitud?: number; longitud?: number };
      destination?: Partial<DeliveryAddress>;
      customerName?: string;
      customerPhone?: string;
      reference?: string;
      orderValue?: number;
    };

    const dest = body.destination;
    if (
      !body.quoteId ||
      !dest ||
      typeof dest.latitud !== 'number' ||
      typeof dest.longitud !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Datos de envío incompletos.' },
        { status: 400 },
      );
    }

    const origin = body.origin ?? {};
    const provider = resolveDeliveryProvider();
    const shipment = await provider.createShipment({
      quoteId: body.quoteId,
      origin: {
        direccion: origin.direccion ?? 'Sucursal',
        latitud: Number(origin.latitud ?? dest.latitud),
        longitud: Number(origin.longitud ?? dest.longitud),
      },
      destination: {
        direccion: dest.direccion ?? '',
        latitud: dest.latitud,
        longitud: dest.longitud,
        referencia: dest.referencia ?? null,
      },
      customerName: body.customerName ?? 'Cliente web',
      customerPhone: body.customerPhone,
      reference: body.reference,
      orderValue: body.orderValue,
    });

    return NextResponse.json(shipment);
  } catch (err) {
    console.error('[delivery/create]', err);
    return NextResponse.json(
      { error: 'No se pudo crear el envío.' },
      { status: 500 },
    );
  }
}
