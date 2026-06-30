import { NextResponse, type NextRequest } from 'next/server';
import { resolveDeliveryProvider } from '@/lib/delivery/provider';
import type { DeliveryAddress } from '@/lib/types/db';

/** Req 6: cotiza el envio de productos fisicos (ultima milla). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      origin?: { direccion?: string; latitud?: number; longitud?: number };
      destination?: Partial<DeliveryAddress>;
      orderValue?: number;
    };

    const dest = body.destination;
    if (
      !dest ||
      typeof dest.latitud !== 'number' ||
      typeof dest.longitud !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Dirección de destino inválida.' },
        { status: 400 },
      );
    }

    const origin = body.origin ?? {};
    const provider = resolveDeliveryProvider();
    const quote = await provider.quote({
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
      orderValue: body.orderValue,
    });

    return NextResponse.json(quote);
  } catch (err) {
    console.error('[delivery/quote]', err);
    return NextResponse.json(
      { error: 'No se pudo cotizar el envío.' },
      { status: 500 },
    );
  }
}
