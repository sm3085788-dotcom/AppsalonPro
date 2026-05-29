import { Dimensions, Platform } from 'react-native';

/** Extra lift on Android (Gboard toolbar / edge-to-edge). */
const ANDROID_KEYBOARD_EXTRA = 36;

/**
 * Pixels to raise the chat composer above the software keyboard.
 * Uses screenY when available (more accurate than height alone on edge-to-edge).
 */
export function keyboardComposerLift(event, bottomSafeInset = 0) {
  const coords = event?.endCoordinates;
  if (!coords) return 0;

  let lift = Number(coords.height) || 0;
  if (typeof coords.screenY === 'number' && coords.screenY > 0) {
    const windowH = Dimensions.get('window').height;
    lift = Math.max(lift, windowH - coords.screenY);
  }

  if (Platform.OS === 'android') {
    return Math.max(0, lift - bottomSafeInset) + ANDROID_KEYBOARD_EXTRA;
  }

  return lift;
}
