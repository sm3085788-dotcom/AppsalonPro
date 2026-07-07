import { BIRTHDAY_CLUB_PACKAGE } from '@/lib/birthday/benefits';

export type WhatsAppCustomerContext = {
  nombre?: string | null;
  telefono?: string | null;
  email?: string | null;
  cumpleanos?: string | null;
  direccion?: string | null;
};

function customerDataLines(ctx?: WhatsAppCustomerContext): string[] {
  if (!ctx) return [];

  const lines: string[] = [];
  const nombre = ctx.nombre?.trim();
  const telefono = ctx.telefono?.trim();
  const email = ctx.email?.trim();
  const cumpleanos = ctx.cumpleanos?.trim();
  const direccion = ctx.direccion?.trim();

  if (!nombre && !telefono && !email && !cumpleanos && !direccion) return lines;

  lines.push('Datos del cliente:');
  if (nombre) lines.push(`• Nombre: ${nombre}`);
  if (telefono) lines.push(`• Teléfono: ${telefono}`);
  if (email) lines.push(`• Correo: ${email}`);
  if (cumpleanos) {
    lines.push(`• Fecha de nacimiento: ${formatBirthdayDate(cumpleanos) ?? cumpleanos}`);
  }
  if (direccion) lines.push(`• Dirección: ${direccion}`);
  return lines;
}

function greetingLine(ctx?: WhatsAppCustomerContext): string {
  const nombre = ctx?.nombre?.trim();
  if (nombre) return `Hola, equipo de Andreas Salon. Soy ${nombre}.`;
  return 'Hola, equipo de Andreas Salon.';
}

function closingLine(): string {
  return 'Muchas gracias. Quedo pendiente de su respuesta.';
}

function joinMessageParts(parts: string[]): string {
  return parts
    .filter((line, index, arr) => line !== '' || (index > 0 && arr[index - 1] !== ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function formatBirthdayDate(cumpleanos?: string | null): string | null {
  const raw = cumpleanos?.trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }

  return raw;
}

function joinPremiumSections(sections: string[][]): string {
  return sections
    .map((section) => section.filter((line) => line.trim().length > 0).join('\n'))
    .filter((section) => section.length > 0)
    .join('\n\n');
}

function webOriginFooterSubtle(moduleLabel: string): string {
  return `*enviado desde la web · ${moduleLabel.toLowerCase()}*`;
}

export function buildMembresiasWhatsAppMessage(ctx?: WhatsAppCustomerContext): string {
  const nombre = ctx?.nombre?.trim();
  const telefono = ctx?.telefono?.trim();
  const email = ctx?.email?.trim();
  const direccion = ctx?.direccion?.trim();

  return joinPremiumSections([
    [
      nombre ? `Hola, equipo de Andreas Salon. Soy ${nombre}.` : 'Hola, equipo de Andreas Salon.',
      'Quiero recibir asesoría sobre las Membresías Andreas (Bronce, Plata y VIP) y coordinar una visita en salón.',
    ],
    [
      'Contacto',
      telefono ? `Tel: ${telefono}` : '',
      email ? `Correo: ${email}` : '',
      direccion ? `Direccion: ${direccion}` : 'Direccion:',
    ],
    ['Gracias, quedo pendiente de su respuesta.'],
    [webOriginFooterSubtle('Membresías')],
  ]);
}

export function buildCumpleanosWhatsAppMessage(ctx?: WhatsAppCustomerContext): string {
  const nombre = ctx?.nombre?.trim();
  const birthdayDate = formatBirthdayDate(ctx?.cumpleanos);
  const telefono = ctx?.telefono?.trim();
  const email = ctx?.email?.trim();
  const direccion = ctx?.direccion?.trim();

  return joinPremiumSections([
    [
      nombre ? `Hola, equipo de Andreas Salon. Soy ${nombre}.` : 'Hola, equipo de Andreas Salon.',
      `Quiero agendar mi visita del ${BIRTHDAY_CLUB_PACKAGE.name}, Club Tu Cumpleaños.`,
    ],
    [
      'Contacto',
      birthdayDate ? `Mi cumpleaños: ${birthdayDate}` : '',
      telefono ? `Tel: ${telefono}` : '',
      email ? `Correo: ${email}` : '',
      direccion ? `Direccion: ${direccion}` : 'Direccion:',
    ],
    ['Gracias, quedo pendiente de su respuesta.'],
    [webOriginFooterSubtle('Club Tu Cumpleaños')],
  ]);
}

export function buildGiftCardWhatsAppMessage(ctx?: WhatsAppCustomerContext): string {
  return joinMessageParts([
    greetingLine(ctx),
    '',
    'Deseo validar el monto y completar el pago de mi tarjeta regalo Andreas Salon. Agradezco su orientación para recibir el código de activación.',
    '',
    'Consulta: Tarjeta regalo · Web catálogo Andreas Salon',
    '',
    ...customerDataLines(ctx),
    '',
    closingLine(),
  ]);
}

export function buildGeneralWhatsAppMessage(ctx?: WhatsAppCustomerContext): string {
  return joinMessageParts([
    greetingLine(ctx),
    '',
    'Me gustaría recibir información y atención personalizada de Andreas Salon.',
    '',
    ...customerDataLines(ctx),
    '',
    closingLine(),
  ]);
}

export type WhatsAppCustomerTopic = 'general' | 'membresias' | 'cumpleanos' | 'giftCard';

const MESSAGE_BUILDERS: Record<
  WhatsAppCustomerTopic,
  (ctx?: WhatsAppCustomerContext) => string
> = {
  general: buildGeneralWhatsAppMessage,
  membresias: buildMembresiasWhatsAppMessage,
  cumpleanos: buildCumpleanosWhatsAppMessage,
  giftCard: buildGiftCardWhatsAppMessage,
};

export function buildWhatsAppCustomerMessage(
  topic: WhatsAppCustomerTopic = 'general',
  context?: WhatsAppCustomerContext,
): string {
  return MESSAGE_BUILDERS[topic](context);
}

export function whatsappContextFromCliente(
  row?: {
    nombre?: string | null;
    telefono?: string | null;
    email?: string | null;
    cumpleanos?: string | null;
    direccion?: string | null;
  } | null,
  fallbackEmail?: string | null,
): WhatsAppCustomerContext | undefined {
  if (!row && !fallbackEmail) return undefined;

  return {
    nombre: row?.nombre ?? null,
    telefono: row?.telefono ?? null,
    email: row?.email ?? fallbackEmail ?? null,
    cumpleanos: row?.cumpleanos ?? null,
    direccion: row?.direccion ?? null,
  };
}
