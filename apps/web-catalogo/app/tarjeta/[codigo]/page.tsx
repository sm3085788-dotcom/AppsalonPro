import type { Metadata } from 'next';
import Link from 'next/link';
import { GiftCardVisual } from '@/components/gift-card/GiftCardVisual';
import {
  formatGiftCardDate,
  giftCardPublicPath,
  normalizeGiftCardCode,
  GIFT_CARD_SITE_URL,
} from '@/lib/gift-card/public';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type PageProps = { params: Promise<{ codigo: string }> };

async function loadCard(codigo: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.rpc('lookup_gift_card_public', { p_codigo: codigo });
  if (!data?.ok) return null;
  return data.card as {
    codigo: string;
    monto_inicial: number;
    para_nombre: string;
    de_nombre: string;
    mensaje: string | null;
    emitida_en: string;
    vence_en: string;
    estado: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { codigo: raw } = await params;
  const codigo = normalizeGiftCardCode(raw);
  const card = await loadCard(codigo);
  if (!card) {
    return { title: 'Tarjeta no encontrada · ANDREAS' };
  }
  return {
    title: `Tarjeta VIP $${card.monto_inicial} · ANDREAS`,
    description: `Regalo de ${card.de_nombre} para ${card.para_nombre}. Válida hasta ${formatGiftCardDate(card.vence_en)}.`,
    openGraph: {
      title: 'Tarjeta VIP ANDREAS',
      description: `Un regalo premium de $${card.monto_inicial} GTQ`,
      url: `${GIFT_CARD_SITE_URL}${giftCardPublicPath(codigo)}`,
    },
  };
}

export default async function PublicGiftCardPage({ params }: PageProps) {
  const { codigo: raw } = await params;
  const codigo = normalizeGiftCardCode(raw);
  const card = await loadCard(codigo);

  if (!card) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-muted">Esta tarjeta no existe o el código es incorrecto.</p>
        <Link href="/" className="mt-6 inline-block text-gold">
          Descubre ANDREAS
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <p className="eyebrow text-gold">Tarjeta de regalo</p>
      <h1 className="mt-3 text-3xl font-light text-cream">Experiencia VIP ANDREAS</h1>
      <p className="mt-3 text-sm text-muted">
        Presenta este código en cualquier sucursal dentro de los 30 días. Estado:{' '}
        <span className="text-gold">{card.estado}</span>
      </p>
      <div className="mt-10">
        <GiftCardVisual
          data={{
            codigo: card.codigo,
            monto: Number(card.monto_inicial),
            paraNombre: card.para_nombre,
            deNombre: card.de_nombre,
            mensaje: card.mensaje,
            emitidaEn: card.emitida_en,
            venceEn: card.vence_en,
            showDates: true,
          }}
        />
      </div>
      <div className="mt-10 rounded-2xl border border-gold/20 bg-gold/5 p-6 text-sm text-muted">
        <p>
          Presenta esta tarjeta en recepción dentro de los 30 días. El salón activará tu saldo al
          verificar tu identidad.
        </p>
        <Link
          href="/"
          className="link-underline mt-6 inline-block text-[13px] uppercase tracking-widest text-cream"
        >
          Conoce más en ANDREAS Salon
        </Link>
      </div>
    </div>
  );
}
