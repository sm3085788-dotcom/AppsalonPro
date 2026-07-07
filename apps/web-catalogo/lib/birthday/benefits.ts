export type BirthdayPackageItem = {
  title: string;
  detail: string;
};

export const BIRTHDAY_CLUB_PACKAGE = {
  name: 'Paquete Celebración Andreas',
  scheduleNote:
    'Programá tu visita en el salón para que nuestro equipo gestione tu experiencia de cumpleaños con todo el cariño que mereces.',
  serviceDiscounts: [
    {
      title: '10% en coloración',
      detail:
        'Renová tu tono, mechas o balayage con técnicas profesionales y un beneficio exclusivo de cumpleaños.',
    },
    {
      title: '10% en cejas',
      detail:
        'Perfilá y definí tu mirada con diseño, henna o laminado, con atención personalizada en cabina.',
    },
    {
      title: '10% en manicure',
      detail:
        'Elegí esmaltado clásico, gel o diseño; tus uñas listas para brillar en tu celebración.',
    },
    {
      title: '10% en pedicure',
      detail:
        'Cuidado completo de pies con exfoliación, hidratación y acabado impecable para sentirte renovada.',
    },
    {
      title: '10% en planchado',
      detail:
        'Liso sedoso o ondas definidas con acabado de salón, ideal para lucir tu mejor versión ese día.',
    },
    {
      title: '10% en maquillaje',
      detail:
        'Look natural, social o de noche aplicado por nuestras artistas para resaltar tu belleza.',
    },
    {
      title: '12% en productos',
      detail:
        'Llevate a casa cuidado capilar, skincare o maquillaje premium con un descuento especial de cumpleaños.',
    },
  ] satisfies BirthdayPackageItem[],
  giftsIntro:
    'Además, Andreas Salon te obsequia estos detalles mientras te consentimos en el salón, pensados para que tu día se sienta inolvidable.',
  gifts: [
    {
      title: 'Lavado y secado gratis',
      detail:
        'Iniciá tu experiencia con un lavado relajante en lavacabezas y secado profesional sin costo adicional.',
    },
    {
      title: 'Bebida y snacks ilimitados',
      detail:
        'Refrigerio, café o té, bocadillos y bebidas alcohólicas de alta gama durante tu visita para que te sientas cómoda y celebrada.',
    },
    {
      title: 'Peinado gratis',
      detail:
        'Terminá tu servicio con peinado de cortesía: ondas, liso o recogido según tu look del día.',
    },
    {
      title: 'Fotografía profesional de tu look',
      detail:
        'Te capturamos el resultado final para que te lleves un recuerdo hermoso de tu día especial.',
    },
    {
      title: 'Regalo sorpresa Andreas',
      detail:
        'Al finalizar tu visita, un detalle exclusivo del salón en sobre dorado como cierre de tu celebración.',
    },
  ] satisfies BirthdayPackageItem[],
} as const;

export function birthdayPackageIntro(firstName?: string): string {
  const base =
    'Preparamos este paquete completo para que disfrutes tu día especial con cada detalle, servicio y obsequio.';
  if (firstName?.trim()) {
    return `${firstName.trim()}, ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
  }
  return base;
}

export function birthdayGreeting(firstName?: string): string {
  if (firstName?.trim()) {
    return `¡Feliz cumpleaños, ${firstName.trim()}! Desde Andreas Salon te enviamos un abrazo lleno de cariño. Queremos que este día se sienta tan especial como tú.`;
  }
  return '¡Feliz cumpleaños! Desde Andreas Salon te enviamos un abrazo lleno de cariño. Queremos que este día se sienta tan especial como tú.';
}
