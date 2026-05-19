import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildClienteFichaHtml } from '@appsalon/shared-config';

async function photoUrlToDataUrl(photoUrl) {
  const url = String(photoUrl || '').trim();
  if (!url.startsWith('http')) return null;
  const ext = url.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  const dest = `${FileSystem.cacheDirectory || ''}cliente_ficha_${Date.now()}.${ext}`;
  const dl = await FileSystem.downloadAsync(url, dest);
  const base64 = await FileSystem.readAsStringAsync(dl.uri, {
    encoding: FileSystem.EncodingType?.Base64 ?? 'base64',
  });
  return `data:${mime};base64,${base64}`;
}

/**
 * Genera un PDF con foto y datos; permite imprimir o compartir un solo archivo.
 */
export async function shareClienteFicha(cli) {
  if (!cli?.id && !cli?.nombre) {
    throw new Error('No hay datos de cliente para exportar.');
  }

  let photoDataUrl = null;
  if (cli.photo_url) {
    try {
      photoDataUrl = await photoUrlToDataUrl(cli.photo_url);
    } catch {
      /* PDF sin foto */
    }
  }

  const html = buildClienteFichaHtml(cli, { photoDataUrl });
  const { uri } = await Print.printToFileAsync({ html });
  if (!uri) {
    throw new Error('No se pudo crear el PDF.');
  }

  await new Promise((resolve, reject) => {
    Alert.alert(
      'Ficha de cliente',
      'PDF listo. Podés imprimirlo o compartirlo (WhatsApp, correo, archivos).',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => resolve(),
        },
        {
          text: 'Imprimir',
          onPress: async () => {
            try {
              await Print.printAsync({ uri });
              resolve();
            } catch (e) {
              reject(e);
            }
          },
        },
        {
          text: 'Compartir PDF',
          onPress: async () => {
            try {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                  mimeType: 'application/pdf',
                  UTI: 'com.adobe.pdf',
                  dialogTitle: `Ficha · ${cli.nombre || 'Cliente'}`,
                });
              } else {
                Alert.alert('PDF guardado', uri);
              }
              resolve();
            } catch (e) {
              reject(e);
            }
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve() },
    );
  });
}
