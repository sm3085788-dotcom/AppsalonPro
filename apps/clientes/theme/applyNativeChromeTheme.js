import { Platform } from 'react-native';

/**
 * Alinea ventana Android / barra de navegación con el fondo del tema.
 * No importa módulos nativos al inicio: si el binario no los trae (Expo Go o dev client viejo), no rompe.
 */
export function applyNativeChromeTheme(isDark, backgroundColor) {
  try {
    const SystemUI = require('expo-system-ui');
    const p = SystemUI.setBackgroundColorAsync(backgroundColor);
    if (p && typeof p.catch === 'function') void p.catch(() => {});
  } catch {
    /* expo-system-ui no enlazado en este binario */
  }

  if (Platform.OS !== 'android') return;

  try {
    const NavigationBar = require('expo-navigation-bar');
    NavigationBar.setStyle(isDark ? 'dark' : 'light');
    /* Con edge-to-edge (app.json), setBackgroundColorAsync solo emite WARN y no aplica. */
    let edgeToEdge = false;
    try {
      edgeToEdge = require('react-native-is-edge-to-edge').isEdgeToEdge();
    } catch {
      /* sin detector */
    }
    if (!edgeToEdge) {
      const p = NavigationBar.setBackgroundColorAsync(backgroundColor);
      if (p && typeof p.catch === 'function') void p.catch(() => {});
    }
  } catch {
    /* expo-navigation-bar no enlazado — ClientThemedRoot + scroll siguen el tema */
  }
}
