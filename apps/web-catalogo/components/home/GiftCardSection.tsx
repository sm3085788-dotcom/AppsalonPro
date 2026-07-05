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
        {/* Columna izquierda: Imagen/Visual - Premium VIP */}
        <div className="relative flex items-center justify-center">
          {/* Efecto de luz trasera premium */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gold/20 via-transparent to-cream/10 blur-3xl opacity-40" />
          
          <div className="relative h-96 w-full max-w-sm overflow-hidden rounded-3xl border border-gold/60 bg-gradient-to-br from-charcoal via-charcoal/95 to-black p-8 shadow-2xl">
            {/* Borde interno premium */}
            <div className="absolute inset-4 rounded-2xl border border-gold/20 pointer-events-none" />
            
            {/* Decoración de tarjeta VIP - patrones sutiles */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-radial from-gold/15 to-transparent blur-2xl" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-radial from-cream/10 to-transparent blur-2xl" />
            
            <div className="relative flex h-full flex-col justify-between">
              {/* Logo/Icono superior con estilo VIP */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5">
                  <Gift className="h-4 w-4 text-gold" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">
                    VIP
                  </span>
                </div>
                <div className="text-2xl font-serif text-gold tracking-widest">ANDREAS</div>
              </div>

              {/* Línea divisoria dorada premium */}
              <div className="h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-70" />

              {/* Contenido central */}
              <div className="text-center">
                <p className="text-xs font-light text-cream/60 uppercase tracking-widest">Valor de la tarjeta</p>
                <p className="mt-3 text-5xl font-serif text-gold font-bold">
                  {formData.amount ? `$${formData.amount}` : '∞'}
                </p>
                <p className="mt-2 text-xs text-cream/40">Premium Experience</p>
              </div>

              {/* Línea divisoria dorada premium */}
              <div className="h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-70" />

              {/* Info inferior con estilo VIP */}
              <div className="space-y-2 text-xs font-light text-cream/70">
                {formData.forName ? (
                  <p className="text-center">
                    <span className="text-gold font-semibold">PARA:</span> <span className="tracking-widest">{formData.forName}</span>
                  </p>
                ) : (
                  <p className="text-center text-cream/40">Para: _______________</p>
                )}
                {formData.fromName ? (
                  <p className="text-center">
                    <span className="text-gold font-semibold">DE:</span> <span className="tracking-widest">{formData.fromName}</span>
                  </p>
                ) : (
                  <p className="text-center text-cream/40">De: _______________</p>
                )}
                {formData.message && (
                  <p className="mt-3 text-center italic text-cream/50">"{formData.message}"</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: Formulario */}
        <div>
          <div className="mb-8">
            <p className="eyebrow text-gold">Experiencia VIP</p>
            <h2 className="mt-4 text-balance text-3xl font-light leading-snug text-foreground sm:text-4xl">
              Tarjeta{' '}
              <span className="text-gold">Premium</span>
            </h2>
            <p className="mt-2 inline-block rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold mb-4">
              Recargable y Transferible
            </p>
            <p className="mt-4 max-w-lg text-base font-light leading-relaxed text-muted">
              Regala una experiencia excepcional. Nuestras tarjetas premium son válidas en todos nuestros servicios, sin fecha de vencimiento y con beneficios VIP exclusivos.
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
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all ${
                      formData.amount === amount.toString()
                        ? 'border-gold bg-gold/20 text-gold shadow-lg shadow-gold/30'
                        : 'border-gold/30 text-cream/70 hover:border-gold hover:text-gold hover:bg-gold/10'
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
                className="mt-3 w-full rounded-lg border border-gold/30 bg-surface/50 px-4 py-3 text-foreground placeholder-muted outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30 focus:bg-surface"
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
                className="mt-3 w-full rounded-lg border border-gold/30 bg-surface/50 px-4 py-3 text-foreground placeholder-muted outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30 focus:bg-surface"
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
                className="mt-3 w-full rounded-lg border border-gold/30 bg-surface/50 px-4 py-3 text-foreground placeholder-muted outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30 focus:bg-surface"
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
                className="mt-3 w-full rounded-lg border border-gold/30 bg-surface/50 px-4 py-3 text-foreground placeholder-muted outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30 focus:bg-surface resize-none"
              />
              <p className="mt-1 text-xs text-muted">
                {formData.message.length}/150 caracteres
              </p>
            </div>

            {/* Botón de envío Premium */}
            <button
              type="submit"
              className="group mt-8 inline-flex w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-gold to-gold-soft px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-charcoal transition-all hover:shadow-2xl hover:shadow-gold/50 hover:scale-105"
            >
              <Gift className="h-5 w-5" />
              Generar Tarjeta VIP
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
