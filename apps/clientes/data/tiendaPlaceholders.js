/**
 * Huecos de producto solo UI — enlazar después con API / Supabase.
 * El primer hueco incluye un producto demo completo para revisar maquetación.
 */

/** Producto de muestra con todos los campos que usa la tarjeta (GTQ, envío, valoraciones). */
export const TIENDA_DEMO_PRODUCT = {
  id: 'demo-keratin-kit',
  /** Marca / línea (texto pequeño sobre el título). */
  brandLine: 'Keraplús · Profesional',
  /** Título comercial (2 líneas en rejilla). */
  title: 'Tratamiento keratina premium — kit reparación capilar 250 ml',
  /** Imagen principal (rejilla / resúmenes). */
  imageUri:
    'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&q=80&auto=format&fit=crop',
  /** Galería ficha detalle — 4 fotos; el usuario desliza manualmente (sin auto-carrusel). */
  imageUris: [
    'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1527799820374-dcfada240bfd?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1560869713-b31170498189?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=900&q=80&auto=format&fit=crop',
  ],
  /** Precio actual en quetzales. */
  priceLabel: 'Q 189.00',
  /** Precio antes de promo (tachado); opcional. */
  compareAtLabel: 'Q 249.00',
  /** Insignia sobre la foto (esquina). */
  badge: 'Más vendido',
  rating: 4.6,
  reviewCount: 128,
  /** Texto de envío / retiro (una línea; puede truncarse). */
  shippingLabel: 'Envío gratis Ciudad de Guatemala · Retiro en salón el mismo día',
  /** Nota de inventario (opcional). */
  stockHint: 'En stock · 14 unidades',
  /** Valor numérico para totales de checkout (demo). */
  priceAmount: 189,
  sku: 'KERA-KIT-250-GL',
};

/** Especificaciones para la ficha ampliada (solo texto). */
export const TIENDA_DEMO_SPECS = [
  { label: 'Presentación', value: 'Frasco 250 ml + guante y brochita' },
  { label: 'Tipo de cabello', value: 'Dañado, teñido, con frizz o poroso' },
  { label: 'Resultado', value: 'Brillo, sedosidad y sellado de puntas hasta 8 semanas (referencia)' },
  { label: 'Uso', value: 'Aplicación en salón recomendada; mantenimiento en casa con shampoo sin sulfatos' },
  { label: 'País de origen', value: 'Italia · Importación para uso profesional' },
  { label: 'Advertencias', value: 'No ingerir. Evitar contacto con ojos. Ventilación adecuada.' },
];

/** Descripción larga para scroll en detalle. */
export const TIENDA_DEMO_LONG_COPY =
  'Kit demo para maquetación: fórmula con queratina vegetal y aminoácidos de referencia. La versión final mostrará ingredientes INCI, caducidad y lote desde tu inventario del salón.';

export const TIENDA_PRODUCT_SLOTS = Array.from({ length: 12 }, (_, i) => ({
  id: `prod-slot-${i + 1}`,
  index: i + 1,
  ...(i === 0 ? { product: TIENDA_DEMO_PRODUCT } : {}),
}));
