import { Image, Platform, View, StyleSheet } from 'react-native';

const SOURCE = require('../assets/aura-logo.png');

/** Android: resizeMethod "scale" suaviza el escalado del raster (menos bloques que el valor por defecto). */
const ANDROID_IMAGE_SCALE =
  Platform.OS === 'android' ? { resizeMethod: 'scale' } : undefined;

/**
 * Logo Aura (activo maestro). Mismo recurso en login, intro y donde haga falta.
 *
 * @param {number} [diameter] — tamaño en px (cuadrado).
 */
export function AuraLogoMark({ diameter = 112, style }) {
  const s = diameter;
  return (
    <View
      style={[styles.wrap, { width: s, height: s }, style]}
      accessibilityRole="image"
      accessibilityLabel="Aura Salón"
    >
      <Image
        {...ANDROID_IMAGE_SCALE}
        source={SOURCE}
        style={{ width: s, height: s }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
