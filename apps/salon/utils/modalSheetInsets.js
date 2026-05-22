import { Platform } from 'react-native';
import { spacing } from '@appsalon/design-tokens';

/** Mínimo cuando Android no reporta insets.bottom (barra de navegación 3 botones). */
const ANDROID_NAV_MIN = 44;

/**
 * Padding inferior para hojas modales (filtros, «Listo», etc.) por encima de la barra del sistema.
 */
export function modalSheetBottomPad(insets) {
  const safe = Number(insets?.bottom) || 0;
  const floor = Platform.OS === 'android' ? Math.max(safe, ANDROID_NAV_MIN) : safe;
  return floor + spacing.xl;
}

/** Mismo criterio para ScrollView dentro de modales. */
export function modalScrollBottomPad(insets) {
  return modalSheetBottomPad(insets);
}
