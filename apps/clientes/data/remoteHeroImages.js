/**
 * Imágenes remotas (Unsplash) — salón, citas, belleza.
 * Se cargan por URL en tiempo de ejecución (no binarios en el repo).
 */
export const HOME_HERO_SLIDES = [
  {
    id: '1',
    uri: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=85&auto=format&fit=crop',
    caption: 'Tu salón de confianza',
  },
  {
    id: '2',
    uri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=900&q=85&auto=format&fit=crop',
    caption: 'Estilistas expertos',
  },
  {
    id: '3',
    uri: 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=900&q=85&auto=format&fit=crop',
    caption: 'Experiencia premium',
  },
  {
    id: '4',
    uri: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=900&q=85&auto=format&fit=crop',
    caption: 'Reserva en segundos',
  },
  {
    id: '5',
    uri: 'https://images.unsplash.com/photo-1595476108010-b4d582f2c484?w=900&q=85&auto=format&fit=crop',
    caption: 'Agenda tu próxima visita',
  },
];

/** Marca de agua compras — fila «Tienda» en Inicio (acceso rápido) */
export const SHOPPING_WATERMARK_URI =
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=85&auto=format&fit=crop';

/** Marcas de agua para accesos rápidos en Inicio */
export const TRENDS_WATERMARK_URI =
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=85&auto=format&fit=crop';
export const REWARDS_WATERMARK_URI =
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=85&auto=format&fit=crop';
export const ORDERS_WATERMARK_URI =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=85&auto=format&fit=crop';

/**
 * Carrusel «Servicios destacados» — balayage / coloración (distintas del hero principal).
 */
export const FEATURED_BALAYAGE_SLIDES = [
  {
    id: 'bal-1',
    uri: 'https://images.unsplash.com/photo-1560869713-b31170498189?w=900&q=85&auto=format&fit=crop',
    caption: 'Balayage · trabajo en salón',
  },
  {
    id: 'bal-2',
    uri: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=900&q=85&auto=format&fit=crop',
    caption: 'Mechas y luminosidad',
  },
  {
    id: 'bal-3',
    uri: 'https://images.unsplash.com/photo-1527799820374-dcfada240bfd?w=900&q=85&auto=format&fit=crop',
    caption: 'Coloración artística',
  },
  {
    id: 'bal-4',
    uri: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=900&q=85&auto=format&fit=crop',
    caption: 'Detalle de acabado',
  },
  {
    id: 'bal-5',
    uri: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900&q=85&auto=format&fit=crop',
    caption: 'Resultado natural',
  },
];
