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
    // Sync nav icons and use theme-matched nav background for devices
    // where Android enforces contrast and ignores full transparency.
    const button = NavigationBar.setButtonStyleAsync?.(isDark ? 'light' : 'dark');
    if (button && typeof button.catch === 'function') void button.catch(() => {});
    const legacy = NavigationBar.setStyle?.(isDark ? 'light' : 'dark');
    if (legacy && typeof legacy.catch === 'function') void legacy.catch(() => {});

    const pos = NavigationBar.setPositionAsync?.('absolute');
    if (pos && typeof pos.catch === 'function') void pos.catch(() => {});
    const beh = NavigationBar.setBehaviorAsync?.('overlay-swipe');
    if (beh && typeof beh.catch === 'function') void beh.catch(() => {});
    const border = NavigationBar.setBorderColorAsync?.('#00000000');
    if (border && typeof border.catch === 'function') void border.catch(() => {});
    const navBg = backgroundColor || (isDark ? '#121212' : '#F9F9F9');
    const solid = NavigationBar.setBackgroundColorAsync?.(navBg);
    if (solid && typeof solid.catch === 'function') void solid.catch(() => {});
  } catch {
    /* expo-navigation-bar no enlazado */
  }
}
