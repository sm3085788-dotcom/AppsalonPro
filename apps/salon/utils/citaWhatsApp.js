import { Alert, Linking } from 'react-native';
import { formatCitaFechaHoraSalon, formatCitaHoraSalon } from './citaFechaHora';

/** Datos del salón para mensajes al cliente (sincronizado con ficha Google Maps). */
export const SALON_CONTACTO = {
  nombre: "Andrea's salón",
  whatsapp: '50247132123',
  telefonoLabel: '+502 4713 2123',
  direccion: 'Progreso, Guastatoya',
  /** Plus Code de la ficha en Google Maps. */
  plusCode: 'VW2J+69F',
  mapsQuery: 'VW2J+69F, Guastatoya, Guatemala',
  /** 14°51'02.0"N 90°04'08.7"W — decimal de la ficha Google Maps. */
  latitude: 14.850553,
  longitude: -90.069092,
  /** Enlaces compartidos desde Waze y Apple Maps (ubicación exacta del salón). */
  wazeUrl:
    'https://ul.waze.com/ul?ll=14.85056726%2C-90.06908298&navigate=yes&zoom=17&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location',
  appleUrl: 'https://maps.apple/p/SErM5cbbv_5Puj',
};

/** Enlaces por app; Google con coordenadas de la ficha, Waze y Apple con enlace compartido. */
export function getSalonMapLinks() {
  const { latitude: lat, longitude: lng, wazeUrl, appleUrl } = SALON_CONTACTO;
  const coords = encodeURIComponent(`${lat},${lng}`);
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${coords}`,
    waze: wazeUrl,
    apple: appleUrl,
  };
}

const MAPAS_WHATSAPP = [
  { nombre: 'Google Maps', key: 'google' },
  { nombre: 'Waze', key: 'waze' },
  { nombre: 'Apple Maps', key: 'apple' },
];

function buildMapasWhatsAppLines(maps) {
  const bloques = MAPAS_WHATSAPP.map(({ nombre, key }) => `*${nombre}*\n${maps[key]}`);
  return ['', '🗺️ *Cómo llegar* (tocá el enlace de tu app de mapas):', ...bloques];
}

function formatPrecioGtq(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return null;
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Normaliza teléfono guatemalteco para wa.me (solo dígitos, con código 502). */
export function normalizeWhatsAppPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 8) d = `502${d}`;
  if (d.startsWith('502') && d.length >= 11) return d.slice(0, 11);
  if (d.length >= 10 && d.length <= 15) return d;
  return null;
}

/**
 * Texto de confirmación de cita para WhatsApp.
 * @param {{ clienteNombre?: string, servicio?: string, fechaHora: string|Date, profesionalNombre?: string, precio?: number, estado?: 'pendiente'|'confirmado' }} p
 */
export function buildCitaWhatsAppMessage(p) {
  const nombre = String(p?.clienteNombre || 'Cliente').trim() || 'Cliente';
  const servicio = String(p?.servicio || 'Cita en salón').trim();
  const dt = p?.fechaHora instanceof Date ? p.fechaHora : new Date(p?.fechaHora || Date.now());
  const fechaTxt = formatCitaFechaHoraSalon(dt, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const horaTxt = formatCitaHoraSalon(dt);
  const prof = String(p?.profesionalNombre || '').trim();
  const precioTxt = formatPrecioGtq(p?.precio);
  const confirmada = String(p?.estado || 'pendiente').toLowerCase() === 'confirmado';

  const intro = confirmada
    ? `¡Hola ${nombre}! 👋\n\nTu cita en *${SALON_CONTACTO.nombre}* fue *confirmada*.`
    : `¡Hola ${nombre}! 👋\n\nGracias por agendar con *${SALON_CONTACTO.nombre}*.`;

  const lines = [
    intro,
    '',
    '📋 *Detalle de tu cita*',
    `• Servicio: ${servicio}`,
    `• Fecha: ${fechaTxt}`,
    `• Hora: ${horaTxt}`,
  ];
  if (prof) lines.push(`• Profesional: ${prof}`);
  if (precioTxt) lines.push(`• Total estimado: ${precioTxt}`);

  const maps = getSalonMapLinks();
  lines.push(
    '',
    `📍 *Ubicación:* ${SALON_CONTACTO.direccion}`,
    ...buildMapasWhatsAppLines(maps),
    '',
    `📞 ${SALON_CONTACTO.telefonoLabel}`,
    '',
    '⏰ *Un día antes de tu cita* nuestro equipo te *llamará* para confirmar la reserva.',
    '',
    'Si necesitás reprogramar, respondé a este mensaje.',
    '',
    '¡Te esperamos!',
    `— ${SALON_CONTACTO.nombre}`,
  );
  return lines.join('\n');
}

export function getCitaWhatsAppUrl(telefono, message) {
  const phone = normalizeWhatsAppPhone(telefono);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Pregunta si desea abrir WhatsApp con el mensaje de cita (no envía automático sin intervención).
 */
export function offerEnviarCitaWhatsApp(params) {
  const est = String(params?.estado || '').toLowerCase();
  if (est === 'rechazado' || est === 'rechazada' || est === 'cancelado' || est === 'cancelada') {
    Alert.alert('Cita rechazada', 'No se puede enviar confirmación por WhatsApp en una cita rechazada.');
    return Promise.resolve(false);
  }

  const phone = normalizeWhatsAppPhone(params?.telefono);
  if (!phone) {
    Alert.alert(
      'Sin teléfono',
      'Este cliente no tiene número en su ficha. Agregalo en Clientes para enviar la confirmación por WhatsApp.',
    );
    return Promise.resolve(false);
  }

  const message = buildCitaWhatsAppMessage(params);
  const url = getCitaWhatsAppUrl(params.telefono, message);
  const cliente = String(params?.clienteNombre || 'el cliente').trim();

  return new Promise((resolve) => {
    Alert.alert(
      'Enviar por WhatsApp',
      `¿Abrir WhatsApp para enviar la confirmación de cita a ${cliente}?`,
      [
        { text: 'Ahora no', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Abrir WhatsApp',
          onPress: () => {
            void (async () => {
              try {
                const supported = await Linking.canOpenURL(url);
                if (!supported) {
                  Alert.alert('WhatsApp', 'No se pudo abrir WhatsApp en este dispositivo.');
                  resolve(false);
                  return;
                }
                await Linking.openURL(url);
                resolve(true);
              } catch (e) {
                Alert.alert('WhatsApp', e?.message || 'No se pudo abrir WhatsApp.');
                resolve(false);
              }
            })();
          },
        },
      ],
    );
  });
}
