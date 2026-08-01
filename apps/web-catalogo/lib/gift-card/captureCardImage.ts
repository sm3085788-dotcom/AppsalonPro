'use client';

import { toPng } from 'html-to-image';
import {
  GIFT_CARD_CAPTURE_PAD,
  GIFT_CARD_CAPTURE_PIXEL_RATIO,
  GIFT_CARD_EXPORT_WIDTH_PX,
  GIFT_CARD_THEME,
} from '@/components/gift-card/giftCardVisualUi';

export {
  GIFT_CARD_CAPTURE_PIXEL_RATIO,
  GIFT_CARD_EXPORT_WIDTH_PX,
} from '@/components/gift-card/giftCardVisualUi';

const CARD_BG = GIFT_CARD_THEME.bg;
const EXPORT_WIDTH_PX = GIFT_CARD_EXPORT_WIDTH_PX;

async function waitForPaint() {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

async function ensureMaxQrResolution(el: HTMLElement) {
  const imgs = el.querySelectorAll('img[alt^="QR tarjeta"]');
  await Promise.all(
    Array.from(imgs).map(async (node) => {
      const img = node as HTMLImageElement;
      try {
        const url = new URL(img.src, window.location.href);
        if (url.pathname.includes('/api/gift-card/qr')) {
          url.searchParams.set('size', '512');
          const next = url.toString();
          if (img.src !== next) {
            img.src = next;
          }
        }
      } catch {
        /* ignore */
      }
      if (img.complete && img.naturalWidth > 0) {
        await img.decode?.().catch(() => undefined);
        return;
      }
      await new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
      await img.decode?.().catch(() => undefined);
    }),
  );
}

async function waitForImages(el: HTMLElement) {
  const images = Array.from(el.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      if (!img.getAttribute('crossorigin')) {
        img.setAttribute('crossorigin', 'anonymous');
      }
      if (img.complete) {
        await img.decode?.().catch(() => undefined);
        return;
      }
      await new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
      await img.decode?.().catch(() => undefined);
    }),
  );
}

export async function captureElementPng(el: HTMLElement): Promise<string> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  await waitForPaint();

  const inner = el.firstElementChild as HTMLElement | null;
  const prevOverflow = el.style.overflow;
  const prevFilter = el.style.filter;
  const prevWidth = el.style.width;
  const prevMaxWidth = el.style.maxWidth;
  const prevInnerWidth = inner?.style.width;
  const prevInnerMaxWidth = inner?.style.maxWidth;

  try {
    el.style.overflow = 'visible';
    el.style.filter = GIFT_CARD_THEME.depthShadow;
    el.style.width = `${EXPORT_WIDTH_PX + GIFT_CARD_CAPTURE_PAD * 2}px`;
    el.style.maxWidth = `${EXPORT_WIDTH_PX + GIFT_CARD_CAPTURE_PAD * 2}px`;

    if (inner) {
      inner.style.width = `${EXPORT_WIDTH_PX}px`;
      inner.style.maxWidth = `${EXPORT_WIDTH_PX}px`;
    }

    await ensureMaxQrResolution(el);
    await waitForImages(el);
    await waitForPaint();

    return await toPng(el, {
      cacheBust: true,
      pixelRatio: GIFT_CARD_CAPTURE_PIXEL_RATIO,
      backgroundColor: CARD_BG,
      preferredFontFormat: 'woff2',
      style: {
        overflow: 'visible',
        height: 'auto',
        maxHeight: 'none',
        width: `${EXPORT_WIDTH_PX + GIFT_CARD_CAPTURE_PAD * 2}px`,
        margin: '0',
        transform: 'none',
        filter: GIFT_CARD_THEME.depthShadow,
        padding: `${GIFT_CARD_CAPTURE_PAD}px`,
        boxSizing: 'border-box',
      },
    });
  } finally {
    el.style.overflow = prevOverflow;
    el.style.filter = prevFilter;
    el.style.width = prevWidth;
    el.style.maxWidth = prevMaxWidth;
    if (inner) {
      inner.style.width = prevInnerWidth ?? '';
      inner.style.maxWidth = prevInnerMaxWidth ?? '';
    }
  }
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
