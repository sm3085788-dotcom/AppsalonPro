import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { buildClienteExportJson, buildClienteExportText } from '@appsalon/shared-config';

export async function shareClienteFicha(cli) {
  if (!cli?.id && !cli?.nombre) {
    throw new Error('No hay datos de cliente para exportar.');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }
  const stamp = cli.id || Date.now();
  const dir = FileSystem.cacheDirectory || '';
  const txtPath = `${dir}cliente-${stamp}.txt`;
  const jsonPath = `${dir}cliente-${stamp}.json`;
  await FileSystem.writeAsStringAsync(txtPath, buildClienteExportText(cli), {
    encoding: 'utf8',
  });
  await FileSystem.writeAsStringAsync(jsonPath, buildClienteExportJson(cli), {
    encoding: 'utf8',
  });

  const photoUrl = String(cli.photo_url || '').trim();
  if (photoUrl.startsWith('http')) {
    const ext = photoUrl.toLowerCase().includes('.png') ? 'png' : 'jpg';
    const photoPath = `${dir}cliente-${stamp}-foto.${ext}`;
    try {
      await FileSystem.downloadAsync(photoUrl, photoPath);
      await Sharing.shareAsync(photoPath, {
        mimeType: ext === 'png' ? 'image/png' : 'image/jpeg',
        dialogTitle: 'Mi foto de perfil',
      });
    } catch {
      /* continuar */
    }
  }

  await Sharing.shareAsync(jsonPath, {
    mimeType: 'application/json',
    dialogTitle: 'Mis datos (JSON)',
  });
  await Sharing.shareAsync(txtPath, {
    mimeType: 'text/plain',
    dialogTitle: 'Mis datos (texto)',
  });
}
