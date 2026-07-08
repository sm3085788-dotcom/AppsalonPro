'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { scrollToHashWhenReady } from '@/lib/hashNavigation';
import {
  redeemGiftCardActivationCode,
  giftCardSuccessPath,
  type RedeemedGiftCard,
} from '@/lib/gift-card/redeemActivationCode';

type GiftCardActivationCodeFormProps = {
  variant?: 'home' | 'page';
  initialCodigo?: string;
  className?: string;
  onActivated?: (card: RedeemedGiftCard) => void;
};

export function GiftCardActivationCodeForm({
  variant = 'page',
  initialCodigo = '',
  className = '',
  onActivated,
}: GiftCardActivationCodeFormProps) {
  const [codigo, setCodigo] = useState(initialCodigo);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await redeemGiftCardActivationCode(codigo);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (onActivated) {
        onActivated(result.card);
        window.requestAnimationFrame(() => {
          scrollToHashWhenReady('#tarjeta-regalo-dashboard', 40, 40);
        });
        return;
      }

      window.location.assign(giftCardSuccessPath(result.card.codigo));
    } finally {
      setBusy(false);
    }
  }

  const isHome = variant === 'home';

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className={`${isHome ? 'mt-3 w-full max-w-[20.4rem] border-t border-gold/20 pt-3' : 'mt-8 space-y-4'} ${className}`.trim()}
      id={isHome ? 'tarjeta-regalo-activar' : undefined}
    >
      {isHome ? (
        <>
          <p className="text-[10px] font-medium uppercase tracking-[0.17em] text-gold">
            ¿Ya pagaste en salón?
          </p>
          <p className="mt-1 text-[11px] font-light leading-snug text-muted">
            Ingresá tu código ACT para ver y descargar tu tarjeta oficial. Podés verlo las veces que
            necesites, pero la tarjeta deja de funcionar una vez agotado su saldo.
          </p>
        </>
      ) : null}

      <div className={isHome ? 'mt-2' : ''}>
        <label
          className={`block uppercase tracking-widest text-muted ${
            isHome ? 'text-[10px] font-medium tracking-[0.17em] text-foreground' : 'mb-2 text-xs'
          }`}
        >
          Código de activación
        </label>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="ACT-123456"
          maxLength={12}
          autoComplete="off"
          className={
            isHome
              ? 'mt-1 w-full rounded-md border border-gold/30 bg-surface/50 px-3 py-2 text-center text-sm uppercase tracking-widest text-foreground placeholder-muted outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30 focus:bg-surface'
              : 'w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm uppercase tracking-widest text-foreground outline-none focus:border-gold'
          }
          required
        />
      </div>

      {error ? (
        <p
          className={`rounded-md border border-red-500/30 bg-red-500/5 text-red-300 ${
            isHome ? 'mt-2 p-2 text-xs' : 'rounded-xl p-3 text-sm'
          }`}
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !codigo.trim()}
        className={
          isHome
            ? 'mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-gold/40 bg-surface-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold transition-colors hover:border-gold/60 hover:bg-gold/5 disabled:opacity-60'
            : 'flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-semibold text-charcoal disabled:opacity-60'
        }
      >
        <KeyRound className={isHome ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {busy ? 'Verificando…' : isHome ? 'Ver mi tarjeta' : 'Activar y generar tarjeta'}
      </button>
    </form>
  );
}
