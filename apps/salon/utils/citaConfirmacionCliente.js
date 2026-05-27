import { Alert } from 'react-native';
import { db, buildCitaConfirmacionPayload } from '@appsalon/shared-config';
import { offerEnviarCitaWhatsApp } from './citaWhatsApp';

const SALON_NOMBRE = "Andrea's salón";

/** Tarjeta luxury en Andreas Pro (JSON estructurado). */
export function buildCitaInAppMessage(p) {
  return buildCitaConfirmacionPayload(p);
}

export async function sendCitaConfirmacionInApp({ clienteId, clienteNombre, clienteTelefono, message, sender }) {
  if (!clienteId) {
    return { data: null, error: { message: 'El cliente no tiene ficha vinculada a App Clientes.' } };
  }
  return db.marketingDirectMessages.create({
    client_id: clienteId,
    client_name: clienteNombre || 'Cliente',
    client_phone: clienteTelefono || null,
    content: message,
    content_type: 'cita_confirmacion',
    status: 'pending_sync',
    created_by: sender?.id || null,
    created_by_name: sender?.name || SALON_NOMBRE,
  });
}

/**
 * Tras confirmar o registrar cita: WhatsApp opcional o mensaje in-app (sin ir a Pedidos).
 */
export function offerConfirmacionCitaCliente(params) {
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

  if (tieneApp) {
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
