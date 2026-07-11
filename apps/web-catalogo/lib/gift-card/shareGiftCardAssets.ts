'use client';

import {
  buildGiftCardShareText,
  buildGiftCardShareUrl,
  buildWhatsAppShareUrl,
} from '@/lib/gift-card/shareMessage';

async function waitForPaint() {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

async function tryNativeShare(payload: ShareData): Promise<'shared' | 'aborted' | 'unsupported'> {
  if (!navigator.share) return 'unsupported';
  if (navigator.canShare && !navigator.canShare(payload)) return 'unsupported';
  try {
    await navigator.share(payload);
    return 'shared';
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'aborted';
    return 'unsupported';
  }
}

async function copyShareText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadCardImages(
  frontUrl: string,
  backUrl: string,
  fileSlug: string,
  triggerPngDownload: (dataUrl: string, filename: string) => void,
) {
  triggerPngDownload(frontUrl, `tarjeta-vip-frente-${fileSlug}.png`);
  window.setTimeout(() => {
    triggerPngDownload(backUrl, `tarjeta-vip-reverso-${fileSlug}.png`);
  }, 350);
}

function offerWhatsAppShare(text: string, copied: boolean) {
  const open = window.confirm(
    copied
      ? 'Se descargaron las imágenes y copiamos el mensaje al portapapeles. ¿Abrir WhatsApp para compartirlo? (Podés pegar el texto y adjuntar las imágenes.)'
      : 'Se descargaron las imágenes de la tarjeta. ¿Abrir WhatsApp para compartir el mensaje con el enlace y nuestras redes sociales?',
  );
  if (!open) return;
  window.open(buildWhatsAppShareUrl(text), '_blank', 'noopener,noreferrer');
}

export async function shareGiftCardAssets({
  codigo,
  monto,
  paraNombre,
  fileSlug,
  captureFront,
  captureBack,
}: {
  codigo: string;
  monto: number;
  paraNombre?: string;
  fileSlug: string;
  captureFront: () => Promise<string>;
  captureBack: () => Promise<string>;
}): Promise<void> {
  const { dataUrlToPngFile, triggerPngDownload } = await import('@/lib/gift-card/captureCardImage');

  await waitForPaint();

  const frontUrl = await captureFront();
  await waitForPaint();
  const backUrl = await captureBack();
  const text = buildGiftCardShareText({ codigo, monto, paraNombre });
  const shareUrl = buildGiftCardShareUrl(codigo);
  const frontFile = await dataUrlToPngFile(frontUrl, `tarjeta-vip-frente-${fileSlug}.png`);
  const backFile = await dataUrlToPngFile(backUrl, `tarjeta-vip-reverso-${fileSlug}.png`);

  const sharedBoth = await tryNativeShare({
    title: 'Tarjeta VIP ANDREAS',
    text,
    files: [frontFile, backFile],
  });
  if (sharedBoth === 'shared' || sharedBoth === 'aborted') return;

  const sharedFront = await tryNativeShare({
    title: 'Tarjeta VIP ANDREAS — Frente',
    text,
    files: [frontFile],
  });
  if (sharedFront === 'shared' || sharedFront === 'aborted') return;

  const sharedText = await tryNativeShare({
    title: 'Tarjeta VIP ANDREAS',
    text,
    url: shareUrl,
  });
  if (sharedText === 'shared' || sharedText === 'aborted') return;

  downloadCardImages(frontUrl, backUrl, fileSlug, triggerPngDownload);
  const copied = await copyShareText(text);
  offerWhatsAppShare(text, copied);
}
