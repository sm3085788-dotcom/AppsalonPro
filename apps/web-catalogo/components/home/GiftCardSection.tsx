'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Gift } from 'lucide-react';
import {
  GIFT_CARD_MIN_GTQ,
  GIFT_CARD_MAX_GTQ,
  GIFT_CARD_PRESETS,
  validateGiftCardPayload,
} from '@/lib/gift-card/validation';
import { saveGiftCardCheckoutPayload } from '@/components/gift-card/GiftCardCheckoutForm';
import { GiftCardVisual } from '@/components/gift-card/GiftCardVisual';

export function GiftCardSection() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    amount: '',
    forName: '',
    fromName: '',
    message: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validated = validateGiftCardPayload({ ...formData, buyerEmail: '' });
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    setSubmitting(true);
    saveGiftCardCheckoutPayload(validated.payload);
    router.push('/tarjeta-regalo/preview');
  };

  const previewAmount = Number(formData.amount) || 0;

  return (
    <section
      id="tarjeta-regalo"
      className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 pb-28"
    >
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="relative flex items-center justify-center lg:min-h-[27rem] lg:py-6">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gold/20 via-transparent to-cream/10 blur-3xl opacity-40" />
          <div className="origin-center lg:scale-[1.3]">
            <GiftCardVisual
              compact
              data={{
                codigo: 'GC-PREVIEW',
                monto: previewAmount || 100,
                paraNombre: formData.forName || 'Destinatario',
                deNombre: formData.fromName || 'Remitente',
                mensaje: formData.message || null,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="mb-8 max-w-lg">
            <p className="eyebrow text-gold">Experiencia VIP</p>
            <h2 className="mt-4 text-balance text-3xl font-light leading-snug text-foreground sm:text-4xl">
              Tarjeta <span className="text-gold">Premium</span>
            </h2>
            <p className="mt-2 mb-4 inline-block rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold">
              Canjeable en cualquier sucursal
            </p>
            <p className="mt-4 text-base font-light leading-relaxed text-muted">
              Regala una experiencia excepcional. Válida 30 días desde la activación. Para
              completar el pago, comunícate con servicio al cliente; el salón te entregará un
              código para generar la tarjeta oficial.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[20.4rem] space-y-[1.275rem] text-center">
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.17em] text-foreground">
                Monto de la tarjeta (Q{GIFT_CARD_MIN_GTQ}–{GIFT_CARD_MAX_GTQ})
              </label>
              <div className="mt-2.5 flex flex-wrap justify-center gap-2.5">
                {GIFT_CARD_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setFormData({ ...formData, amount: amount.toString() })}
                    className={`rounded-md border-2 px-3 py-1.5 text-xs font-semibold transition-all ${
                      formData.amount === amount.toString()
                        ? 'border-gold bg-gold/20 text-gold shadow-lg shadow-gold/30'
                        : 'border-gold/30 text-cream/70 hover:border-gold hover:bg-gold/10 hover:text-gold'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={GIFT_CARD_MIN_GTQ}
                max={GIFT_CARD_MAX_GTQ}
                placeholder="O ingresa otro monto"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="mt-2.5 w-full rounded-md border border-gold/30 bg-surface/50 px-3.5 py-2.5 text-sm text-center text-foreground placeholder-muted outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30 focus:bg-surface"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.17em] text-foreground">
                Para (nombre del destinatario)
              </label>
              <input
                type="text"
                required
                placeholder="Ej: María"
                value={formData.forName}
                onChange={(e) => setFormData({ ...formData, forName: e.target.value })}
                className="mt-2.5 w-full rounded-md border border-gold/30 bg-surface/50 px-3.5 py-2.5 text-sm text-center text-foreground placeholder-muted outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30 focus:bg-surface"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.17em] text-foreground">
                De (tu nombre)
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Juan"
                value={formData.fromName}
                onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                className="mt-2.5 w-full rounded-md border border-gold/50 bg-surface/50 px-3.5 py-2.5 text-sm text-center text-foreground placeholder-muted outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30 focus:bg-surface"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.17em] text-foreground">
                Mensaje adicional
              </label>
              <textarea
                placeholder="Ej: ¡Espero que disfrutes de un día de relax!"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                maxLength={150}
                rows={3}
                className="mt-2.5 w-full resize-none rounded-md border border-gold/30 bg-surface/50 px-3.5 py-2.5 text-sm text-center text-foreground placeholder-muted outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30 focus:bg-surface"
              />
              <p className="mt-1 text-[10px] text-muted">
                {formData.message.length}/150 caracteres
              </p>
            </div>

            {error ? (
              <p className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="group mt-7 inline-flex w-full items-center justify-center gap-2.5 rounded-md bg-gradient-to-r from-gold to-gold-soft px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.17em] text-charcoal transition-all hover:scale-105 hover:shadow-2xl hover:shadow-gold/50 disabled:opacity-60"
            >
              <Gift className="h-4 w-4" />
              Generar vista previa
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
