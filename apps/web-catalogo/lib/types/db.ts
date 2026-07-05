/**
 * Tipos estrictos de dominio para AppSalon Pro (web).
 * Se mapean a las tablas en espanol existentes en Supabase.
 */

export type UUID = string;
export type ISODateString = string;

/* ── Branch → public.sucursales ─────────────────────────────────────────── */
export interface Branch {
  id: UUID;
  codigo: string;
  nombre: string;
  es_matriz: boolean;
  activa: boolean;
  direccion: string | null;
  telefono: string | null;
  created_at: ISODateString;
}

/* ── Inventario (catalogo maestro: servicios y productos) ───────────────── */
export interface InventarioRow {
  id: UUID;
  nombre: string;
  categoria: string | null;
  precio_venta: number | null;
  precio_costo: number | null;
  stock_actual: number | null;
  stock_minimo: number | null;
  imagen_url: string | null;
  imagenes_urls: string[] | null;
  descripcion_tienda: string | null;
  visible_en_tienda: boolean | null;
  barcode: string | null;
  /** Campo libre del salon; puede incluir un bloque JSON con metadatos de tienda. */
  notas: string | null;
}

/* ── Service → inventario marcado como servicio ─────────────────────────── */
export interface Service {
  id: UUID;
  nombre: string;
  categoria: string | null;
  /** Precio referencia (columna inventario); no es el total si precioVariable. */
  precio: number;
  /** Servicio con tabla por volumen: no mostrar precio fijo en catálogo. */
  precioVariable: boolean;
  descripcion: string | null;
  imagenUrl: string | null;
  duracionMin: number | null;
  rating: number | null;
  reviewCount: number;
}

/* ── Product → inventario fisico con stock por sucursal ─────────────────── */
export interface Product {
  id: UUID;
  nombre: string;
  categoria: string | null;
  precio: number;
  descripcion: string | null;
  imagenUrl: string | null;
  imagenesUrls: string[];
  /** Stock de la sucursal seleccionada (0 si no hay). */
  stock: number;
  enStock: boolean;
  rating: number | null;
  reviewCount: number;
}

/* ── Stock por sucursal → public.inventario_stock_sucursal ──────────────── */
export interface BranchStock {
  id: UUID;
  sucursal_id: UUID;
  inventario_id: UUID;
  stock_actual: number;
  stock_minimo: number;
}

/* ── Booking → public.citas ─────────────────────────────────────────────── */
export type BookingStatus =
  | 'pendiente'
  | 'confirmada'
  | 'completada'
  | 'cancelada';

export type FulfillmentType = 'salon' | 'domicilio';

export interface Booking {
  id: UUID;
  sucursal_id: UUID | null;
  /** Vinculo al cliente (public.clientes.id), no al auth user. */
  cliente_id: UUID | null;
  servicio: string;
  estado: BookingStatus;
  fecha_hora: ISODateString;
  precio: number | null;
  duracion_minutos: number | null;
  notas_servicio: string | null;
  /** Coordenadas para servicio a domicilio (Req 7). */
  latitud: number | null;
  longitud: number | null;
  direccion_domicilio: string | null;
}

/* ── Review → public.inventario_resenas ─────────────────────────────────── */
export interface Review {
  id: UUID;
  inventario_id: UUID;
  client_user_id: UUID;
  cliente_id: UUID | null;
  autor_nombre: string;
  rating: number;
  comentario: string;
  foto_urls: string[];
  created_at: ISODateString;
}

/* ── Realtime liviano (Req 2) ───────────────────────────────────────────── */
/**
 * Payload minimo que la web emite por broadcast al crear/actualizar una cita.
 * El APK recibe solo esto y luego consulta el detalle por id (ahorro de datos).
 */
export interface BookingBroadcast {
  booking_id: UUID;
  estado: BookingStatus;
}

/* ── Stripe (checkout) ──────────────────────────────────────────────────── */
export type CheckoutKind = 'booking' | 'product' | 'gift_card';

export interface GiftCardPaymentIntentInput {
  monto: number;
  paraNombre: string;
  deNombre: string;
  mensaje?: string;
  compradorEmail: string;
}

export interface CreatePaymentIntentInput {
  kind: CheckoutKind;
  sucursalId?: UUID;
  /** Lineas para productos. */
  items?: Array<{ inventarioId: UUID; cantidad: number }>;
  /** Datos de la cita cuando kind === 'booking'. */
  booking?: {
    servicioId: UUID;
    servicio: string;
    fechaHora: ISODateString;
    fulfillment: FulfillmentType;
    latitud?: number | null;
    longitud?: number | null;
    direccion?: string | null;
  };
  /** Tarjeta regalo VIP (guest checkout). */
  giftCard?: GiftCardPaymentIntentInput;
}

export interface GiftCardPaymentIntentResult extends PaymentIntentResult {
  draftId: string | null;
}

export interface PaymentIntentResult {
  clientSecret: string | null;
  amount: number;
  currency: string;
  demo: boolean;
  paymentIntentId: string | null;
}

/* ── Delivery (Req 6) ───────────────────────────────────────────────────── */
export interface DeliveryAddress {
  direccion: string;
  latitud: number;
  longitud: number;
  referencia?: string | null;
}

export interface DeliveryQuote {
  provider: string;
  quoteId: string;
  fee: number;
  currency: string;
  etaMinutes: number;
  expiresAt: ISODateString;
}

export interface DeliveryShipment {
  provider: string;
  shipmentId: string;
  trackingUrl: string | null;
  status: 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'canceled';
}
