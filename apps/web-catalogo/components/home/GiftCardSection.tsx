'use client';

import { useState } from 'react';
import { Gift } from 'lucide-react';
import Image from 'next/image';

export function GiftCardSection() {
  const [formData, setFormData] = useState({
    amount: '',
    forName: '',
    fromName: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Gift card data:', formData);
    // Aquí iría la lógica para procesar la tarjeta de regalo
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 pb-28">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Columna izquierda: Imagen/Visual */}
        <div className="relative flex items-center justify-center">
          <div className="relative h-96 w-full max-w-sm overflow-hidden rounded-3xl border-2 border-gold/30 bg-gradient-to-br from-gold/10 to-cream/20 p-8 shadow-lg">
            {/* Decoración de tarjeta */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,#d4af37,transparent)]" />
            </div>
            
            <div className="relative flex h-full flex-col justify-between">
              {/* Logo/Icono superior */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-4 py-2">
                  <Gift className="h-5 w-5 text-gold" />
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
                    Tarjeta de Regalo
                  </span>
                </div>
                <div className="text-xl font-serif text-gold">ANDREAS</div>
              </div>

              {/* Contenido central */}
              <div className="text-center">
                <p className="text-sm font-light text-muted">Monto de la tarjeta</p>
                <p className="mt-2 text-4xl font-serif text-gold">
                  {formData.amount ? `$${formData.amount}` : '—'}
                </p>
              </div>

              {/* Info inferior */}
              <div className="space-y-2 text-xs font-light text-muted">
                {formData.forName && (
                  <p>
                    <span className="font-medium text-foreground">Para:</span> {formData.forName}
                  </p>
                )}
                {formData.fromName && (
                  <p>
                    <span className="font-medium text-foreground">De:</span> {formData.fromName}
                  </p>
                )}
                {formData.message && (
                  <p className="mt-3 italic text-muted">"{formData.message}"</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: Formulario */}
        <div>
          <div className="mb-8">
            <p className="eyebrow">Regala experiencia</p>
            <h2 className="mt-4 text-balance text-3xl font-light leading-snug text-foreground sm:text-4xl">
              Tarjeta de regalo{' '}
              <span className="text-gold">recargable</span>
            </h2>
            <p className="mt-4 max-w-lg text-base font-light leading-relaxed text-muted">
              Sorprende a alguien especial con una tarjeta de regalo Andreas.
              Perfecta para cualquier ocasión. Válida en todos nuestros servicios
              y productos premium.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Monto */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.2em] text-foreground">
                Monto de la tarjeta
              </label>
              <div className="mt-3 flex gap-3">
                {[50, 100, 200, 500].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, amount: amount.toString() })
                    }
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                      formData.amount === amount.toString()
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-border text-muted hover:border-gold/50'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="O ingresa otro monto"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="mt-3 w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder-muted outline-none transition-colors focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
              />
            </div>

            {/* Para quién */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.2em] text-foreground">
                Para (nombre del destinatario)
              </label>
              <input
                type="text"
                placeholder="Ej: María"
                value={formData.forName}
                onChange={(e) =>
                  setFormData({ ...formData, forName: e.target.value })
                }
                className="mt-3 w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder-muted outline-none transition-colors focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
              />
            </div>

            {/* De quién */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.2em] text-foreground">
                De (tu nombre)
              </label>
              <input
                type="text"
                placeholder="Ej: Juan"
                value={formData.fromName}
                onChange={(e) =>
                  setFormData({ ...formData, fromName: e.target.value })
                }
                className="mt-3 w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder-muted outline-none transition-colors focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
              />
            </div>

            {/* Mensaje adicional */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.2em] text-foreground">
                Mensaje adicional
              </label>
              <textarea
                placeholder="Ej: ¡Espero que disfrutes de un día de relax!"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                maxLength={150}
                rows={3}
                className="mt-3 w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder-muted outline-none transition-colors focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
              />
              <p className="mt-1 text-xs text-muted">
                {formData.message.length}/150 caracteres
              </p>
            </div>

            {/* Botón de envío */}
            <button
              type="submit"
              className="group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-8 py-4 text-sm font-medium uppercase tracking-[0.18em] text-charcoal transition-all hover:bg-gold-soft"
            >
              <Gift className="h-4 w-4" />
              Crear tarjeta de regalo
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
