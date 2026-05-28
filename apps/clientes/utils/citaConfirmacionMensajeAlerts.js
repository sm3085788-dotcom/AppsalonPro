import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { parseCitaConfirmacionContent } from '@appsalon/shared-config';

const CITA_CONFIRM_ALERT_TITLE = 'Tu cita está confirmada';
const CITA_CONFIRM_ALERT_BODY =
  'El salón confirmó tu cita. Revisá los detalles en Mensajes.';

export function citaConfirmacionAlertBody(message) {
  const card = parseCitaConfirmacionContent(message?.content);
  if (!card) return CITA_CONFIRM_ALERT_BODY;
  const lines = [];
  if (card.servicio) lines.push(String(card.servicio).trim());
  if (card.fecha && card.hora) lines.push(`${card.fecha} · ${card.hora}`);
  else if (card.fecha) lines.push(String(card.fecha).trim());
  if (!lines.length) return card.headline || CITA_CONFIRM_ALERT_BODY;
  return lines.join('\n');
}

const key = (userId) => `andreas_cita_confirm_msg_alertas_${userId}`;

export async function getCitaConfirmacionMsgAlertadas(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export async function addCitaConfirmacionMsgAlertadas(userId, ids) {
  if (!userId || !ids?.length) return;
  const prev = await getCitaConfirmacionMsgAlertadas(userId);
  const set = new Set([...prev, ...ids.map(String)]);
  await AsyncStorage.setItem(key(userId), JSON.stringify([...set]));
}

/**
 * Muestra una sola alerta por mensaje `cita_confirmacion` (Andreas Pro).
 * @returns {boolean} si se mostró la alerta
 */
export async function tryShowCitaConfirmacionAlert(message, userId, opts = {}) {
  const { skipPopup = false, onVerMensajes } = opts;
  if (!userId || !message?.id) return false;
  if (String(message.content_type || '') !== 'cita_confirmacion') return false;

  const msgId = String(message.id);
  const ya = await getCitaConfirmacionMsgAlertadas(userId);
  if (ya.includes(msgId)) return false;

  await addCitaConfirmacionMsgAlertadas(userId, [msgId]);

  if (skipPopup) return true;

  const buttons = [{ text: 'OK', style: 'default' }];
  if (typeof onVerMensajes === 'function') {
    buttons.unshift({
      text: 'Ver mensajes',
      onPress: onVerMensajes,
    });
  }

  Alert.alert(CITA_CONFIRM_ALERT_TITLE, citaConfirmacionAlertBody(message), buttons);
  return true;
}
