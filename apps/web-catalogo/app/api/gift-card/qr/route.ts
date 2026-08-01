import { NextResponse, type NextRequest } from 'next/server';
import { buildGiftCardQrPayload } from '@/lib/gift-card/public';

/** Proxy same-origin del QR para captura PNG fiable (sin CORS). */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('data')?.trim() ?? '';
  const sizeRaw = Number(request.nextUrl.searchParams.get('size') ?? 220);
  const size = Number.isFinite(sizeRaw) ? Math.min(512, Math.max(64, Math.round(sizeRaw))) : 220;

  const normalized = raw.startsWith('APSGIFT:')
    ? raw
    : buildGiftCardQrPayload(raw.replace(/^APSGIFT:/i, ''));

  if (!normalized.startsWith('APSGIFT:')) {
    return NextResponse.json({ error: 'Código vacío.' }, { status: 400 });
  }

  const upstream = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=4&format=png&data=${encodeURIComponent(normalized)}`;
  const res = await fetch(upstream, { next: { revalidate: 86400 } });

  if (!res.ok) {
    return NextResponse.json({ error: 'No se pudo generar el QR.' }, { status: 502 });
  }

  const bytes = await res.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
