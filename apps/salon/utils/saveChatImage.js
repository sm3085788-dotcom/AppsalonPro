import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

function permissionOk(res) {
  return Boolean(res?.granted || res?.status === 'limited');
}

async function ensureGalleryWritePermission() {
  try {
    const current = await MediaLibrary.getPermissionsAsync(true);
    if (permissionOk(current)) return true;
    const requested = await MediaLibrary.requestPermissionsAsync(true);
    return permissionOk(requested);
  } catch {
    const requested = await MediaLibrary.requestPermissionsAsync();
    return permissionOk(requested);
  }
}

async function downloadImageToCache(imageUrl) {
  const url = String(imageUrl || '').trim();
  const ext = /\.png(\?|$)/i.test(url) ? 'png' : 'jpg';
  const dest = `${FileSystem.cacheDirectory || ''}aura_chat_${Date.now()}.${ext}`;
  const dl = await FileSystem.downloadAsync(url, dest);
  if (!dl?.uri) throw new Error('No se pudo descargar la imagen.');
  if (Platform.OS === 'android' && !dl.uri.startsWith('file://') && !dl.uri.startsWith('content://')) {
    return `file://${dl.uri}`;
  }
  return dl.uri;
}

export async function saveChatImageToGallery(imageUrl) {
  const url = String(imageUrl || '').trim();
  if (!url) return { ok: false, error: 'Sin imagen.' };

  const allowed = await ensureGalleryWritePermission();
  if (!allowed) {
    return {
      ok: false,
      error: 'Permiso denegado. En Ajustes del celular activá acceso a Fotos/Galería para esta app.',
    };
  }

  let localUri;
  try {
    localUri = await downloadImageToCache(url);
  } catch (e) {
    return { ok: false, error: e?.message || 'No se pudo descargar la imagen.' };
  }

  try {
    await MediaLibrary.createAssetAsync(localUri);
    return { ok: true, mode: 'gallery' };
  } catch (e1) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: /\.png/i.test(localUri) ? 'image/png' : 'image/jpeg',
          dialogTitle: 'Guardar imagen',
          UTI: 'public.jpeg',
        });
        return { ok: true, mode: 'share' };
      }
    } catch {
      // ignore
    }
    return { ok: false, error: e1?.message || 'No se pudo guardar en la galería.' };
  }
}

export async function saveChatImageWithAlert(imageUrl) {
  const res = await saveChatImageToGallery(imageUrl);
  if (res.ok) {
    Alert.alert(
      'Imagen',
      res.mode === 'share'
        ? 'Elegí “Guardar imagen” o “Galería” en el menú que se abrió.'
        : 'Guardada en la galería.',
    );
  } else {
    Alert.alert('Imagen', res.error || 'No se pudo guardar.');
  }
}
