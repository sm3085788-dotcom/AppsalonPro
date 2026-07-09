'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Gift, KeyRound } from 'lucide-react';
import {
  GIFT_CARD_MIN_GTQ,
  GIFT_CARD_MAX_GTQ,
  GIFT_CARD_PRESETS,
  validateGiftCardPayload,
} from '@/lib/gift-card/validation';
import { saveGiftCardCheckoutPayload } from '@/components/gift-card/GiftCardCheckoutForm';
import { GiftCardVisual } from '@/components/gift-card/GiftCardVisual';
import {
  GIFT_CARD_PREVIEW_INCOMPLETE,
} from '@/lib/gift-card/previewCopy';

export function GiftCardSection() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validated = validateGiftCardPayload({ amount });
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    setSubmitting(true);
    saveGiftCardCheckoutPayload(validated.payload);
    router.push('/tarjeta-regalo/preview');
  };

  const previewAmount = Number(amount) || 0;

  return (
    <section
      id="tarjeta-regalo"
      className="mx-auto max-w-7xl px-4 pt-16 pb-3 sm:px-6 lg:px-8"
    >
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="relative flex items-center justify-center lg:min-h-[27rem] lg:py-6">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gold/20 via-transparent to-cream/10 blur-3xl opacity-40" />
          <div className="origin-center lg:scale-[1.3]">
            <GiftCardVisual
              compact
              incompletePreview
              data={{
                codigo: 'GC-PREVIEW',
                monto: previewAmount || 100,
                paraNombre: GIFT_CARD_PREVIEW_INCOMPLETE.paraNombre,
                deNombre: GIFT_CARD_PREVIEW_INCOMPLETE.deNombre,
                mensaje: null,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="mb-5 max-w-lg">
            <p className="eyebrow text-gold">Experiencia VIP</p>
            <h2 className="mt-2 text-balance text-3xl font-light leading-snug text-foreground sm:text-4xl">
              Tarjeta <span className="text-gold">Premium</span>
            </h2>
            <p className="mt-1.5 mb-2 inline-block rounded-full border border-gold/30 bg-gold/5 px-3 py-0.5 text-xs font-semibold uppercase tracking-widest text-gold">
              Canjeable en cualquier sucursal
            </p>
            <p className="mt-2 text-sm font-light leading-relaxed text-muted">
              Válida 30 días desde la activación. Elige la cantidad y{' '}
              <span className="font-medium text-gold">generá vista previa</span>. Comunícate con
              Atención al Cliente para el pago. Recibirás tu código por mensaje y completás tu
              tarjeta después: es tu secreto.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[20.4rem] space-y-2 text-center">
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.17em] text-foreground">
                Monto de la tarjeta (Q{GIFT_CARD_MIN_GTQ}–{GIFT_CARD_MAX_GTQ.toLocaleString('es-GT')})
              </label>
              <div className="mt-1.5 flex flex-wrap justify-center gap-2">
                {GIFT_CARD_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className={`rounded-md border-2 px-3 py-1.5 text-xs font-semibold transition-all ${
                      amount === preset.toString()
                        ? 'border-gold bg-gold/20 text-gold shadow-lg shadow-gold/30'
                        : 'border-gold/30 text-cream/70 hover:border-gold hover:bg-gold/10 hover:text-gold'
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={GIFT_CARD_MIN_GTQ}
                max={GIFT_CARD_MAX_GTQ}
                placeholder="o ingresa otra cantidad"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-gold/30 bg-surface/50 px-3 py-2 text-sm text-center text-foreground placeholder-muted outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30 focus:bg-surface"
              />
            </div>

            {error ? (
              <p className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-gold to-gold-soft px-6 py-3 text-xs font-semibold uppercase tracking-[0.17em] text-charcoal transition-all hover:scale-105 hover:shadow-2xl hover:shadow-gold/50 disabled:opacity-60"
            >
              <Gift className="h-4 w-4" />
              Generar vista previa
            </button>
          </form>

          <Link
            href="/tarjeta-regalo/activar"
            className="mt-3 inline-flex w-full max-w-[20.4rem] items-center justify-center gap-2 rounded-md border border-gold/40 bg-surface-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold transition-colors hover:border-gold/60 hover:bg-gold/5"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Recuperar mi tarjeta de regalo
          </Link>
        </div>
      </div>
    </section>
  );
}
