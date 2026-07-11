import { Alert, Linking } from 'react-native';
import { normalizeWhatsAppPhone, getCitaWhatsAppUrl, SALON_CONTACTO } from './citaWhatsApp';

const WEB_CATALOGO_BASE = 'https://appsalon-pro-web-catalogo.vercel.app';
const GIFT_CARD_WEB_URL = `${WEB_CATALOGO_BASE}/#tarjeta-regalo`;
const UNETE_EQUIPO_WEB_URL = `${WEB_CATALOGO_BASE}/unete-al-equipo`;

/** URL de activación web con el código ACT precargado en el formulario. */
export function buildGiftCardActivateUrl(codigo) {
  const code = String(codigo || '').trim().toUpperCase();
  const base = `${WEB_CATALOGO_BASE}/tarjeta-regalo/completar`;
  if (!code) return base;
  return `${base}?codigo=${encodeURIComponent(code)}`;
}

/** Mensaje WhatsApp al enviar código ACT al comprador. */
export function buildGiftCardActivationWhatsAppMessage({ codigo, monto } = {}) {
  const code = String(codigo || '').trim().toUpperCase();
  const activateUrl = buildGiftCardActivateUrl(code);
  return [
    `¡Tarjeta VIP ANDREAS · ${formatQ(monto)}`,
    '',
    '¡Gracias por tu noble gesto: el compartir es ganar, eres increíble!',
    SALON_CONTACTO.telefonoLabel,
    'Atención al cliente',
    '',
    '¡Actívala aquí (código precargado) y completá Para, De y mensaje de tu tarjeta!',
    activateUrl,
  ].join('\n');
}

function formatQ(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 'Q 0.00';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatFechaGt(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('es-GT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function joinLines(lines) {
  return lines
    .filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n');
}

export function buildUneteEquipoRevisadoMessage({ clienteNombre } = {}) {
  const nombre = String(clienteNombre || 'Cliente').trim() || 'Cliente';
  return [
    `¡Hola ${nombre}! 👋`,
    '',
    `El equipo de *${SALON_CONTACTO.nombre}* revisó tu documentación de *Únete al Equipo*.`,
    '',
    '✅ *Estado:* Documentación revisada',
    '',
    'Pronto nos pondremos en contacto contigo para los siguientes pasos.',
    '',
    `🌐 *Consultá tu solicitud:* ${UNETE_EQUIPO_WEB_URL}`,
    '',
    'Si tenés alguna pregunta, respondé a este mensaje.',
    '',
    `— ${SALON_CONTACTO.nombre}`,
  ].join('\n');
}

export function buildGiftCardSaldoMessage({
  clienteNombre,
  codigo,
  saldo,
  montoInicial,
  emitidaEn,
  activadaEn,
  venceEn,
} = {}) {
  const nombre = String(clienteNombre || 'Cliente').trim() || 'Cliente';
  const code = String(codigo || '').trim();
  const inicio = formatFechaGt(activadaEn) || formatFechaGt(emitidaEn);
  const vence = formatFechaGt(venceEn);

  return joinLines([
    `¡Hola ${nombre}! 👋`,
    '',
    `Tu *tarjeta regalo VIP Andreas* fue utilizada en salón.`,
    '',
    code ? `💳 *Código:* ${code}` : '',
    `💰 *Saldo actual:* ${formatQ(saldo)} / ${formatQ(montoInicial)}`,
    '',
    inicio ? `📅 *Inicio:* ${inicio}` : '',
    vence ? `📅 *Válida hasta:* ${vence}` : '',
    '📌 Podés seguir usando tu saldo en visitas *hasta agotarlo* o hasta la fecha de vencimiento.',
    '',
    `🌐 *Tu tarjeta en la web:* ${GIFT_CARD_WEB_URL}`,
    '',
    `📞 ${SALON_CONTACTO.telefonoLabel}`,
    '',
    `— ${SALON_CONTACTO.nombre}`,
  ]);
}

export function buildGiftCardAgotadaMessage({
  clienteNombre,
  codigo,
  montoInicial,
  emitidaEn,
  activadaEn,
  venceEn,
} = {}) {
  const nombre = String(clienteNombre || 'Cliente').trim() || 'Cliente';
  const code = String(codigo || '').trim();
  const inicio = formatFechaGt(activadaEn) || formatFechaGt(emitidaEn);
  const vence = formatFechaGt(venceEn);

  return joinLines([
    `¡Hola ${nombre}! 💛`,
    '',
    `¡Gracias por vivir la experiencia Andreas con tu tarjeta regalo!`,
    '',
    code ? `💳 *Tarjeta:* ${code}` : '',
    `✨ *Completada:* usaste los ${formatQ(montoInicial)} con todo el cariño que merecés.`,
    '',
    inicio ? `📅 *Inicio de uso:* ${inicio}` : '',
    vence ? `📅 *Vigencia:* hasta ${vence}` : '',
    '',
    'Si querés regalar la misma experiencia a alguien especial, compartí este enlace con amigos y familiares:',
    '',
    `🎁 ${GIFT_CARD_WEB_URL}`,
    '',
    '¡Ellos también merecen consentirse en Andreas!',
    '',
    `📞 ${SALON_CONTACTO.telefonoLabel}`,
    '',
    `— ${SALON_CONTACTO.nombre}`,
  ]);
}

function isGiftCardAgotada(params) {
  if (params?.agotada) return true;
  if (String(params?.estado || '').toLowerCase() === 'depleted') return true;
  const saldo = Number(params?.saldo);
  return Number.isFinite(saldo) && saldo <= 0;
}

function openWhatsAppUrl(url) {
  return (async () => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('WhatsApp', 'No se pudo abrir WhatsApp en este dispositivo.');
        return false;
      }
      await Linking.openURL(url);
      return true;
    } catch (e) {
      Alert.alert('WhatsApp', e?.message || 'No se pudo abrir WhatsApp.');
      return false;
    }
  })();
}

/**
 * Abre wa.me con confirmación previa (patrón staff: el mensaje se envía al tocar Enviar en WhatsApp).
 */
export function offerEnviarWhatsAppStaff({
  telefono,
  clienteNombre,
  message,
  titulo = 'Enviar por WhatsApp',
  cuerpo,
} = {}) {
  const phone = normalizeWhatsAppPhone(telefono);
  if (!phone) {
    Alert.alert(
      'Sin teléfono',
      'Este cliente no tiene número en su ficha. Agregalo en Clientes para avisar por WhatsApp.',
    );
    return Promise.resolve(false);
  }

  const cliente = String(clienteNombre || 'el cliente').trim();
  const url = getCitaWhatsAppUrl(telefono, message);
  const body = cuerpo || `¿Abrir WhatsApp para avisar a ${cliente}?`;

  return new Promise((resolve) => {
    Alert.alert(titulo, body, [
      { text: 'Ahora no', style: 'cancel', onPress: () => resolve(false) },
      {
        text: 'Abrir WhatsApp',
        onPress: () => {
          void (async () => {
            const ok = await openWhatsAppUrl(url);
            resolve(ok);
          })();
        },
      },
    ]);
  });
}

export function offerUneteEquipoRevisadoWhatsApp(params) {
  const message = buildUneteEquipoRevisadoMessage(params);
  return offerEnviarWhatsAppStaff({
    telefono: params?.telefono,
    clienteNombre: params?.clienteNombre,
    message,
    titulo: 'Avisar revisión',
    cuerpo: `¿Abrir WhatsApp para avisar a ${String(params?.clienteNombre || 'el cliente').trim()} que su documentación fue revisada?`,
  });
}

export function offerGiftCardClienteWhatsApp(params) {
  const cliente = String(params?.clienteNombre || 'el cliente').trim();
  const agotada = isGiftCardAgotada(params);
  const message = agotada
    ? buildGiftCardAgotadaMessage(params)
    : buildGiftCardSaldoMessage(params);

  return offerEnviarWhatsAppStaff({
    telefono: params?.telefono,
    clienteNombre: params?.clienteNombre,
    message,
    titulo: agotada ? 'Agradecer al cliente' : 'Avisar saldo',
    cuerpo: agotada
      ? `¿Abrir WhatsApp para agradecer a ${cliente} y sugerir que comparta la tarjeta regalo con amigos?`
      : `¿Abrir WhatsApp para enviar el saldo actual de la tarjeta a ${cliente}?`,
  });
}

/** @deprecated Usar offerGiftCardClienteWhatsApp */
export function offerGiftCardSaldoWhatsApp(params) {
  return offerGiftCardClienteWhatsApp(params);
}
