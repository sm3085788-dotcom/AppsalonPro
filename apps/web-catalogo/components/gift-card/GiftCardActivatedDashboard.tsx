'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { GiftCardShareCard } from '@/components/gift-card/GiftCardShareCard';
import { formatGiftCardDate } from '@/lib/gift-card/public';
import type { RedeemedGiftCard } from '@/lib/gift-card/redeemActivationCode';

export function GiftCardActivatedDashboard({
  card,
  compact = false,
  onDismiss,
}: {
  card: RedeemedGiftCard;
  compact?: boolean;
  onDismiss?: () => void;
}) {
  return (
    <div
      id="tarjeta-regalo-dashboard"
      className={`relative space-y-3 ${compact ? '' : 'rounded-2xl border border-gold/25 bg-gold/5 p-4 sm:p-5'}`}
    >
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#25D366] transition-colors hover:border-[#25D366]/60 hover:bg-[#25D366]/20 sm:right-4 sm:top-4"
          aria-label="Cerrar vista de tarjeta"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Cerrar
        </button>
      ) : null}

      <div className={compact ? 'text-center' : onDismiss ? 'pr-14 sm:pr-16' : ''}>
        <p className="eyebrow text-gold">Tarjeta oficial</p>
        <h3 className="mt-1 text-lg font-light text-cream sm:text-xl">¡Lista para regalar!</h3>
        <p className="mt-1 text-xs text-muted sm:text-sm">
          Código <span className="font-mono text-gold">{card.codigo}</span>
          {' · '}
          Vence {formatGiftCardDate(card.vence_en)}
        </p>
      </div>

      <GiftCardShareCard
        compact
        data={{
          codigo: card.codigo,
          monto: Number(card.monto_inicial),
          paraNombre: card.para_nombre,
          deNombre: card.de_nombre,
          mensaje: card.mensaje,
          emitidaEn: card.emitida_en,
          venceEn: card.vence_en,
        }}
      />

      {!compact ? (
        <p className="text-center text-[10px] font-light leading-snug text-muted">
          Guardá tu código ACT o el enlace de esta página. No necesitás cuenta en la web para volver a
          ver tu tarjeta.
        </p>
      ) : null}
    </div>
  );
}

export function GiftCardActivatedDashboardLinks() {
  return (
    <div className="flex flex-wrap justify-center gap-4 text-sm">
      <Link
        href="/#tarjeta-regalo"
        className="text-[#25D366] transition-colors hover:text-[#1ebe57]"
      >
        Crear otra tarjeta
      </Link>
      <Link href="/" className="text-muted hover:text-gold">
        Inicio
      </Link>
    </div>
  );
}
