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
 * Carrusel de publicidad (Inicio) — 5 campañas; texto por diapositiva + flecha para avanzar.
 */
export const PUBLICIDAD_SLIDES = [
  {
    id: 'pub-1',
    uri: 'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=900&q=85&auto=format&fit=crop',
    caption: 'Promo coloración',
    kicker: 'Publicidad',
    headline: '20% en coloración premium',
    body: 'Balayage y mechas: agenda esta semana y aplica el descuento en caja.',
    priceLabel: 'Desde $75',
    buttonTitle: 'Ver oferta',
  },
  {
    id: 'pub-2',
    uri: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=900&q=85&auto=format&fit=crop',
    caption: 'Tratamiento facial',
    kicker: 'Nuevo',
    headline: 'Pack hidratación + masaje',
    body: 'Sesión express de 45 min con productos firmados por el salón.',
    priceLabel: '$49',
    buttonTitle: 'Reservar',
  },
  {
    id: 'pub-3',
    uri: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=900&q=85&auto=format&fit=crop',
    caption: 'Manicure temporada',
    kicker: 'Temporada',
    headline: 'Manicure gel con nail art',
    body: 'Elige entre 12 diseños; incluye retiro suave del esmaltado anterior.',
    priceLabel: '2×1 amigas',
    buttonTitle: 'Pedir turno',
  },
  {
    id: 'pub-4',
    uri: 'https://images.unsplash.com/photo-1497553583772-641fa562cd6c?w=900&q=85&auto=format&fit=crop',
    caption: 'Corte y peinado',
    kicker: 'Flash sale',
    headline: 'Corte + brushing modelado',
    body: 'Ideal antes de eventos. Cupos limitados de lunes a miércoles.',
    priceLabel: '$35',
    buttonTitle: 'Aprovechar',
  },
  {
    id: 'pub-5',
    uri: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=900&q=85&auto=format&fit=crop',
    caption: 'Rituales spa',
    kicker: 'Experiencia',
    headline: 'Ritual detox cuero cabelludo',
    body: 'Limpieza profunda, vapor aromático y masaje relajante de 30 minutos.',
    priceLabel: '−15%',
    buttonTitle: 'Más info',
  },
];
