import { Alert } from 'react-native';
import { db, buildCitaConfirmacionPayload, notifyClientFromMdmId } from '@appsalon/shared-config';
import { offerEnviarCitaWhatsApp } from './citaWhatsApp';

const SALON_NOMBRE = "Andrea's salón";

function isCitaRechazada(estado) {
  const v = String(estado || '').toLowerCase();
  return v === 'rechazado' || v === 'rechazada' || v === 'cancelado' || v === 'cancelada';
}

function isCitaConfirmada(estado) {
  return String(estado || '').toLowerCase() === 'confirmado';
}

/** Tarjeta luxury en Andreas Pro (JSON estructurado). */
export function buildCitaInAppMessage(p) {
  return buildCitaConfirmacionPayload(p);
}

export async function sendCitaConfirmacionInApp({ clienteId, clienteNombre, clienteTelefono, message, sender, estado }) {
  if (isCitaRechazada(estado)) {
    return { data: null, error: { message: 'No se puede enviar mensaje en una cita rechazada.' } };
  }
  if (!clienteId) {
    return { data: null, error: { message: 'El cliente no tiene ficha vinculada a App Clientes.' } };
  }
  const { data, error } = await db.marketingDirectMessages.create({
    client_id: clienteId,
    client_name: clienteNombre || 'Cliente',
    client_phone: clienteTelefono || null,
    content: message,
    content_type: 'cita_confirmacion',
    status: 'pending_sync',
    created_by: sender?.id || null,
    created_by_name: sender?.name || SALON_NOMBRE,
  });
  if (!error && data?.id) {
    const { error: notifErr } = await notifyClientFromMdmId(data.id);
    if (notifErr && __DEV__) {
      console.warn('[cita notif]', notifErr.message || notifErr);
    }
  }
  return { data, error };
}

/**
 * Tras confirmar cita en agenda: envía tarjeta a App Clientes y opcionalmente ofrece WhatsApp.
 */
export async function notifyClienteCitaConfirmada(params) {
  if (!isCitaConfirmada(params?.estado)) {
    Alert.alert(
      'Solo citas confirmadas',
      'El mensaje en la app solo se envía cuando la cita está confirmada.',
    );
    return false;
  }
  if (isCitaRechazada(params?.estado)) {
    Alert.alert('Cita rechazada', 'No se puede enviar confirmación en una cita rechazada.');
    return false;
  }

  const cliente = String(params?.clienteNombre || 'el cliente').trim();
  const tieneTel = Boolean(String(params?.telefono || '').replace(/\D/g, ''));
  const tieneApp = Boolean(params?.clienteId);
  if (tieneTel || tieneApp) {
    return offerConfirmacionCitaCliente({
      ...params,
      skipInAppPrompt: false,
    });
  }

  Alert.alert(
    'Confirmación',
    'La cita quedó confirmada. Este cliente no tiene teléfono ni cuenta en App Clientes.',
  );
  return false;
}

/**
 * Tras confirmar o registrar cita: WhatsApp opcional o mensaje in-app (sin ir a Pedidos).
 */
export function offerConfirmacionCitaCliente(params) {
  if (isCitaRechazada(params?.estado)) {
    Alert.alert('Cita rechazada', 'No se puede avisar al cliente de una cita rechazada.');
    return Promise.resolve(false);
  }

  const skipInApp = Boolean(params?.skipInAppPrompt);
  const cliente = String(params?.clienteNombre || 'el cliente').trim();
  const tieneTel = Boolean(String(params?.telefono || '').replace(/\D/g, ''));
  const tieneApp = Boolean(params?.clienteId);

  if (!tieneTel && !tieneApp) {
    Alert.alert(
      'Confirmación',
      'La cita quedó guardada. Este cliente no tiene teléfono ni cuenta en App Clientes.',
    );
    return Promise.resolve(false);
  }

  const buttons = [{ text: 'Ahora no', style: 'cancel', onPress: () => {} }];

  if (tieneApp && !skipInApp && isCitaConfirmada(params?.estado)) {
    buttons.push({
      text: 'Mensaje en la app',
      onPress: () => {
        void (async () => {
          const msg = buildCitaInAppMessage(params);
          const { error } = await sendCitaConfirmacionInApp({
            clienteId: params.clienteId,
            clienteNombre: params.clienteNombre,
            clienteTelefono: params.telefono,
            message: msg,
            sender: params.sender,
            estado: params.estado,
          });
          if (error) {
            Alert.alert('Mensaje en la app', error.message || 'No se pudo enviar.');
            return;
          }
          Alert.alert('Enviado', `La confirmación llegó a Andreas Pro de ${cliente}.`);
        })();
      },
    });
  }

  if (tieneTel) {
    buttons.push({
      text: 'WhatsApp',
      onPress: () => {
        void offerEnviarCitaWhatsApp(params);
      },
    });
  }

  return new Promise((resolve) => {
    Alert.alert(
      'Avisar al cliente',
      tieneApp
        ? `¿Cómo querés avisar a ${cliente}? El mensaje en la app no incluye mapas: el cliente los ve en Perfil → Contactos.`
        : `¿Abrir WhatsApp para avisar a ${cliente}?`,
      buttons.map((b) => ({
        ...b,
        onPress: () => {
          b.onPress?.();
          resolve(true);
        },
      })),
    );
  });
}
