'use client';

import { toPng } from 'html-to-image';

export async function captureElementPng(el: HTMLElement): Promise<string> {
  return toPng(el, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#0a0a0b',
  });
}

export function triggerPngDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function dataUrlToPngFile(dataUrl: string, filename: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], filename, { type: 'image/png' });
}
