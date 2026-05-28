import { uploadMensajeMediaFromUri } from '@appsalon/shared-config';

/**
 * Miniatura JPEG liviana para «Me interesa» (no sube el video completo).
 * @param {string} videoUri URL o file:// del clip
 * @returns {Promise<string|null>} URL pública en bucket mensajes
 */
export async function uploadTendenciasInterestThumbnail(videoUri) {
  const uri = String(videoUri || '').trim();
  if (!uri) return null;

  let thumbUri = null;
  try {
    const VideoThumbnails = await import('expo-video-thumbnails');
    const result = await VideoThumbnails.getThumbnailAsync(uri, {
      time: 800,
      quality: 0.55,
    });
    thumbUri = result?.uri || null;
  } catch {
    return null;
  }

  if (!thumbUri) return null;

  const { publicUrl, error } = await uploadMensajeMediaFromUri(thumbUri, {
    extension: 'jpg',
    contentType: 'image/jpeg',
  });
  if (error || !publicUrl) return null;
  return publicUrl;
}
