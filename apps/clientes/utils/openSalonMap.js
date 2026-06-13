import { Alert, Linking, Platform } from 'react-native';
import { getSalonMapLinks } from '@appsalon/shared-config';

export async function openSalonUbicacionEnMapas() {
  const maps = getSalonMapLinks();
  const candidates =
    Platform.OS === 'ios'
      ? [maps.apple, maps.google, maps.waze]
      : [maps.google, maps.waze, maps.apple];

  for (const url of candidates) {
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // probar siguiente app de mapas
    }
  }

  try {
    await Linking.openURL(maps.google);
  } catch {
    Alert.alert('Ubicación', 'No se pudo abrir la app de mapas en tu dispositivo.');
  }
}
