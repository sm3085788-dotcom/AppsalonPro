/**
 * Intenciones del chat App Clientes ↔ Salón (Andreas Pro).
 * Fuente única para chips del cliente, respuestas sugeridas en matriz y futura automatización n8n.
 *
 * n8nIntent: identificador estable para webhooks / flujos (ej. chat.horario).
 */

export const CHAT_QUICK_INTENTS = [
  {
    id: 'horario',
    n8nIntent: 'chat.horario',
    label: 'Horario',
    clientMessage: '¿Cuál es el horario de atención de la sucursal?',
    salonReply:
      '¡Hola! Nuestro horario es lunes a viernes 9:00 a 19:00 y sábados 9:00 a 17:00. Domingos cerrado. Si necesitás confirmar un día festivo, avisame.',
    matchPatterns: [/horario de atención/i, /horario/i, /qué hora abren/i, /a qué hora/i],
  },
  {
    id: 'ubicacion',
    n8nIntent: 'chat.ubicacion',
    label: 'Ubicación',
    clientMessage: '¿Me comparten la dirección exacta y si hay parqueo cerca?',
    salonReply:
      '¡Hola! Estas son nuestras ubicaciones (central y sucursales):\n{{sucursales_lista}}\n¿Querés que te envíe el pin de alguna en Google Maps?',
    matchPatterns: [/dirección exacta/i, /parqueo/i, /ubicación/i, /cómo llegar/i, /google maps/i, /dónde están/i, /donde estan/i],
  },
  {
    id: 'membresia',
    n8nIntent: 'chat.membresia',
    label: 'Membresía',
    clientMessage: 'Hola, quiero saber cómo funciona la membresía y qué beneficios incluye.',
    salonReply:
      '¡Hola! La membresía Andreas Pro tiene niveles Bronce, Plata y VIP con descuentos en tienda y premios. Podés ver todo en App Clientes → Premios. ¿Te explico cuál te conviene según tu consumo?',
    matchPatterns: [/membresía/i, /membresia/i, /beneficios incluye/i, /niveles bronce/i],
  },
  {
    id: 'promos',
    n8nIntent: 'chat.promos',
    label: 'Promos',
    clientMessage: '¿Qué promociones o descuentos tienen vigentes esta semana?',
    salonReply:
      '¡Hola! Estas son las promociones vigentes en Andreas Pro (cada una con foto y precio):',
    matchPatterns: [/promociones/i, /promos/i, /descuentos/i, /vigentes esta semana/i, /ofertas/i],
  },
  {
    id: 'atencion',
    n8nIntent: 'chat.atencion_cliente',
    label: 'Atención al cliente',
    clientMessage: 'Hola, necesito atención al cliente. ¿Me pueden orientar o escalar mi consulta?',
    salonReply:
      '¡Hola! Gracias por escribirnos. Soy atención al cliente Andreas Pro. Contame tu caso y lo gestionamos con prioridad.',
    matchPatterns: [/atención al cliente/i, /atencion al cliente/i, /escalar mi consulta/i],
  },
  {
    id: 'gracias',
    n8nIntent: 'chat.gracias',
    label: 'Gracias',
    clientMessage: 'Muchas gracias por la atención. Quedo atento/a.',
    salonReply:
      '¡Gracias a vos por contactarnos! Cualquier cosa estamos acá en Andreas Pro. ¡Que tengas un excelente día!',
    matchPatterns: [/muchas gracias/i, /gracias por la atención/i, /quedo atento/i],
  },
];

/** Chips App Clientes (mensaje al tocar ?). */
export const CLIENT_CHAT_QUICK_ACTIONS = CHAT_QUICK_INTENTS.map((row) => ({
  id: row.id,
  label: row.label,
  message: row.clientMessage,
  n8nIntent: row.n8nIntent,
}));

function normalizeForMatch(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** Detecta intención del último mensaje del cliente (para sugerir respuesta en matriz / n8n). */
export function matchChatQuickIntent(text) {
  const norm = normalizeForMatch(text);
  if (!norm) return null;
  for (const row of CHAT_QUICK_INTENTS) {
    if (normalizeForMatch(row.clientMessage) === norm) return row;
    if (row.matchPatterns?.some((re) => re.test(text))) return row;
  }
  return null;
}

export function getChatQuickIntentById(id) {
  return CHAT_QUICK_INTENTS.find((r) => r.id === id) || null;
}

export function getSalonSuggestedReply(intentId) {
  return getChatQuickIntentById(intentId)?.salonReply || '';
}

/** Payload listo para exportar a n8n (webhook / sync). */
export function listChatQuickIntentsForAutomation() {
  return CHAT_QUICK_INTENTS.map((row) => ({
    id: row.id,
    n8nIntent: row.n8nIntent,
    label: row.label,
    clientMessage: row.clientMessage,
    salonReply: row.salonReply,
  }));
}
