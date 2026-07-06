import {
  MEMBRESIA_MONTHLY_GTQ,
  MEMBRESIA_TIERS,
  getMembresiaTier,
} from '../../../../shared/config/membresias.js';

export { MEMBRESIA_TIERS, getMembresiaTier };

export type MembresiaTierId = 'bronce' | 'plata' | 'vip';

export interface MembresiaWebTier {
  id: MembresiaTierId;
  label: string;
  subtitle: string;
  accent: string;
  priceGtq: number;
  benefits: string[];
  featured?: boolean;
}

/** Beneficios presenciales (sin referencias a la app). Fuente: apps/clientes/i18n/membresias.es.js */
const WEB_BENEFITS: Record<MembresiaTierId, string[]> = {
  bronce: [
    'Essential Glow — visitas regulares para raíces, cortes o tratamientos básicos.',
    '1 Secado y Estilizado clásico al mes (válido de martes a jueves).',
    '10% de descuento fijo en todos los servicios (Color, Balayage, Alisados, Keratinas).',
    '5% de descuento en productos premium (Kérastase, L\'Oréal Professionnel, Olaplex).',
    'Barra Básica de Cortesía: café espresso, té importado o agua purificada premium en cada visita.',
  ],
  plata: [
    'Luxury Ritual — ideal si asistís cada semana o quincena (uñas, capilar y estilizado).',
    '2 Secados y Estilizados al mes (válidos cualquier día de la semana).',
    '1 Manicura Premium al mes (exfoliación y masaje de manos).',
    '1 Ampolla o Tratamiento de Hidratación Express al mes en lavacabezas.',
    '15% de descuento fijo en color, extensiones y tratamientos profundos.',
    '10% de descuento en todas las líneas de productos.',
    'Prioridad en lista de espera para días de alta demanda (jueves a sábado).',
    'Detalle de cumpleaños según campaña.',
    'Barra Premium: Mimosa, vino blanco/tinto o espumante de cortesía en cada visita.',
  ],
  vip: [
    'The Royal Sanctuary — estatus, privacidad y trato preferente (máx. 3 visitas/semana).',
    'Secados, lavados y estilizados ilimitados dentro del límite semanal.',
    '1 Tratamiento de Reconstrucción Profunda al mes (Kérastase, Fusio-Dose o Chronologiste).',
    '1 Manicura y Pedicura Spa Completa al mes (jelly spa o parafina).',
    'Garantía de Cita VIP en 24 h: reacomodo de agenda si está llena.',
    'Acceso a Cabina Privada VIP para máxima discreción.',
    'Canal preferente con recepción para agendar.',
    'Acceso anticipado a promociones y eventos.',
    '20% de descuento en microblading, extensiones naturales y balayage de autor.',
    '15% de descuento en todo el catálogo de productos.',
    'Open Bar Premium & catering gourmet durante tus servicios.',
    'Pase de Invitada Mensual: 20% de descuento para una amiga o familiar.',
  ],
};

export function getMembresiaWebCatalog(): MembresiaWebTier[] {
  return MEMBRESIA_TIERS.map((tier) => {
    const id = tier.id as MembresiaTierId;
    return {
      id,
      label: tier.label,
      subtitle: tier.subtitle,
      accent: tier.accent,
      priceGtq: MEMBRESIA_MONTHLY_GTQ[id],
      benefits: WEB_BENEFITS[id],
      featured: id === 'vip',
    };
  });
}

export function formatMembresiaPrice(priceGtq: number): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceGtq);
}
