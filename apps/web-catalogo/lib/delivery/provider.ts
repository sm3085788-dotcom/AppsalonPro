import type {
  DeliveryAddress,
  DeliveryQuote,
  DeliveryShipment,
} from '@/lib/types/db';

/** Origen del envio (sucursal). */
export interface DeliveryOrigin {
  direccion: string;
  latitud: number;
  longitud: number;
}

export interface QuoteRequest {
  origin: DeliveryOrigin;
  destination: DeliveryAddress;
  /** Valor declarado del pedido (GTQ) para seguro/manejo. */
  orderValue?: number;
}

export interface CreateShipmentRequest extends QuoteRequest {
  quoteId: string;
  customerName: string;
  customerPhone?: string;
  reference?: string;
}

/**
 * Req 6: contrato comun para proveedores de ultima milla (Uber Direct, Rappi…).
 * Permite cambiar de proveedor sin tocar las rutas API.
 */
export interface DeliveryProvider {
  readonly name: string;
  quote(req: QuoteRequest): Promise<DeliveryQuote>;
  createShipment(req: CreateShipmentRequest): Promise<DeliveryShipment>;
}

/** Distancia aproximada (km) entre dos coordenadas (Haversine). */
function haversineKm(
  a: { latitud: number; longitud: number },
  b: { latitud: number; longitud: number },
): number {
  const R = 6371;
  const dLat = ((b.latitud - a.latitud) * Math.PI) / 180;
  const dLon = ((b.longitud - a.longitud) * Math.PI) / 180;
  const lat1 = (a.latitud * Math.PI) / 180;
  const lat2 = (b.latitud * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Proveedor mock: tarifa por distancia. Util para desarrollo y como fallback
 * cuando no hay DELIVERY_API_KEY. Mantiene la misma interfaz que uno real.
 */
export class MockDeliveryProvider implements DeliveryProvider {
  readonly name = 'mock';

  async quote(req: QuoteRequest): Promise<DeliveryQuote> {
    const km = haversineKm(req.origin, req.destination);
    const base = 15;
    const perKm = 6;
    const fee = Math.round((base + km * perKm) * 100) / 100;
    const eta = Math.max(20, Math.round(15 + km * 4));
    return {
      provider: this.name,
      quoteId: `mock_${Date.now().toString(36)}`,
      fee,
      currency: 'GTQ',
      etaMinutes: eta,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  async createShipment(
    req: CreateShipmentRequest,
  ): Promise<DeliveryShipment> {
    const id = `mockship_${Date.now().toString(36)}`;
    return {
      provider: this.name,
      shipmentId: id,
      trackingUrl: `https://tracking.example/${id}`,
      status: 'assigned',
    };
  }
}

/**
 * Esqueleto para Uber Direct. La estructura queda lista para conectar la API
 * real; sin DELIVERY_API_KEY cae al mock con `resolveDeliveryProvider`.
 */
export class UberDirectProvider implements DeliveryProvider {
  readonly name = 'uber_direct';
  constructor(private readonly apiKey: string) {}

  async quote(req: QuoteRequest): Promise<DeliveryQuote> {
    // TODO: POST https://api.uber.com/v1/.../delivery_quotes con this.apiKey
    // Por ahora reutiliza el calculo del mock para no romper el flujo.
    return new MockDeliveryProvider().quote(req);
  }

  async createShipment(req: CreateShipmentRequest): Promise<DeliveryShipment> {
    // TODO: POST .../deliveries con this.apiKey
    return new MockDeliveryProvider().createShipment(req);
  }
}

/** Selecciona el proveedor segun env (degrada a mock con elegancia). */
export function resolveDeliveryProvider(): DeliveryProvider {
  const provider = process.env.DELIVERY_PROVIDER ?? 'mock';
  const apiKey = process.env.DELIVERY_API_KEY ?? '';
  if (provider === 'uber_direct' && apiKey) {
    return new UberDirectProvider(apiKey);
  }
  return new MockDeliveryProvider();
}
