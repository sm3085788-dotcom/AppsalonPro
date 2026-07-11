import { SALON_CONTACT } from '@/lib/salonContact';
import { GIFT_CARD_SITE_URL, giftCardPublicPath } from '@/lib/gift-card/public';

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildGiftCardShareUrl(codigo: string): string {
  const code = String(codigo || '').trim();
  if (!code || code.includes('PREVIEW')) return GIFT_CARD_SITE_URL;
  return `${GIFT_CARD_SITE_URL}${giftCardPublicPath(code)}`;
}

export function buildGiftCardShareText({
  codigo,
  monto,
  paraNombre,
}: {
  codigo: string;
  monto: number;
  paraNombre?: string;
}): string {
  const code = String(codigo || '').trim();
  const amount = Number(monto);
  const amountLabel = Number.isFinite(amount)
    ? `Q${amount.toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    : 'VIP';

  if (!code || code.includes('PREVIEW')) {
    const para = paraNombre?.trim();
    return `Vista previa · Tarjeta VIP ANDREAS ${amountLabel}${para ? ` para ${para}` : ''}.`;
  }

  const url = buildGiftCardShareUrl(code);
  const { telefonoLabel, googleMapsUrl, socials } = SALON_CONTACT;

  return [
    `Tarjeta VIP ANDREAS · ${amountLabel}`,
    `Código: ${code}`,
    '',
    '¡Esta tarjeta especial es para ti! Mi mayor satisfacción es que la disfrutes. Puedes usar el saldo en los servicios y productos que te gusten escaneando el código QR en Andreas Salon.',
    url,
    '',
    `*Teléfono:* ${telefonoLabel}`,
    `*Google Maps:* ${googleMapsUrl}`,
    `*Facebook:* ${socials.facebook}`,
    `*Instagram:* ${socials.instagram}`,
    `*TikTok:* ${socials.tiktok}`,
  ].join('\n');
}
