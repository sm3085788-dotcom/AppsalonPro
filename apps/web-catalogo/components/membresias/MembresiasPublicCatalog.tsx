'use client';

import { Crown, Medal, Sparkles, Check } from 'lucide-react';
import { CustomerServiceWhatsAppButton } from '@/components/site/CustomerServiceWhatsAppButton';
import { buildWhatsAppCustomerUrl, type WhatsAppCustomerContext } from '@/lib/salonContact';
import {
  formatMembresiaPrice,
  getMembresiaWebCatalog,
  type MembresiaTierId,
} from '@/lib/membresias/catalog';

const TIER_ICONS = {
  bronce: Medal,
  plata: Sparkles,
  vip: Crown,
} as const;

const TIER_STYLES: Record<
  MembresiaTierId,
  { header: string; body: string; ring?: string }
> = {
  bronce: {
    header: 'bg-gradient-to-br from-[#3a1e00] to-[#6b3a10]',
    body: 'bg-gradient-to-br from-[#2a1600] via-[#4a2a0a] to-[#6b3e14]',
  },
  plata: {
    header: 'bg-gradient-to-br from-[#1e1e30] to-[#38385a]',
    body: 'bg-gradient-to-br from-[#141420] via-[#25253a] to-[#38385a]',
  },
  vip: {
    header: 'bg-gradient-to-br from-[#0f0900] via-[#7a5c00] to-[#C9A24D]',
    body: 'bg-gradient-to-br from-[#0a0600] via-[#3a2c00] to-[#6a5000]',
    ring: 'ring-1 ring-gold/40 shadow-[0_0_28px_rgba(201,162,77,0.12)]',
  },
};

export function MembresiasPublicCatalog({
  customerWhatsappContext,
}: {
  customerWhatsappContext?: WhatsAppCustomerContext;
}) {
  const tiers = getMembresiaWebCatalog();

  return (
    <div className="space-y-11">
      <div className="relative overflow-hidden rounded-xl border border-gold/25 bg-gradient-to-br from-[#1A1612] via-[#0C0B0A] to-black p-5 sm:p-7">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-gold/20 via-gold/5 to-transparent"
          aria-hidden
        />
        <div className="relative max-w-xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/10 px-2.5 py-1">
            <Crown className="h-3 w-3 text-gold" strokeWidth={2.2} />
            <span className="text-[8px] font-medium uppercase tracking-[0.14em] text-gold-soft">
              Membresías Andreas
            </span>
          </div>
          <h2 className="text-balance text-2xl font-light tracking-tight text-cream sm:text-[1.75rem]">
            Tres niveles diseñados para recompensar tu fidelidad
          </h2>
          <div className="mt-3 h-0.5 w-8 rounded-full bg-gold/85" />
          <p className="mt-3.5 text-sm font-light leading-relaxed text-muted">
            Cada membresía incluye beneficios exclusivos en salón. Acércate a cualquier sucursal
            Andreas para adquirirla y activarla con nuestro equipo.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CustomerServiceWhatsAppButton
              href={buildWhatsAppCustomerUrl('membresias', customerWhatsappContext)}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:items-start">
        {tiers.map((tier) => {
          const Icon = TIER_ICONS[tier.id];
          const styles = TIER_STYLES[tier.id];

          return (
            <article
              key={tier.id}
              className={`overflow-hidden rounded-xl border border-white/10 ${styles.ring ?? ''}`}
            >
              <div className={`relative px-4 pb-3.5 pt-4 ${styles.header}`}>
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/[0.04]"
                  aria-hidden
                />

                <div
                  className="mb-2.5 inline-flex items-baseline gap-1 rounded-full border px-2 py-1"
                  style={{
                    borderColor: `${tier.accent}44`,
                    backgroundColor: 'rgba(0,0,0,0.25)',
                  }}
                >
                  <span
                    className="font-serif text-xl tracking-tight"
                    style={{ color: tier.accent }}
                  >
                    {formatMembresiaPrice(tier.priceGtq)}
                  </span>
                  <span className="text-[10px] text-white/55">/ mes</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                    style={{
                      borderColor: `${tier.accent}55`,
                      backgroundColor: `${tier.accent}22`,
                    }}
                  >
                    <Icon className="h-4 w-4" style={{ color: tier.accent }} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="font-serif text-xl tracking-tight text-white">{tier.label}</h3>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-white/45">{tier.subtitle}</p>
                  </div>
                </div>

                {tier.featured ? (
                  <span className="absolute right-3 top-3 rounded-full bg-gold px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-charcoal">
                    Premium
                  </span>
                ) : null}
              </div>

              <div className={`px-4 pb-4 pt-3.5 ${styles.body}`}>
                <div
                  className="mb-2.5 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
                  aria-hidden
                />
                <p
                  className="mb-2.5 text-[8px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: tier.accent }}
                >
                  Beneficios
                </p>
                <ul className="space-y-2">
                  {tier.benefits.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        style={{ color: tier.accent }}
                        strokeWidth={2.5}
                      />
                      <span className="text-[11px] leading-snug text-white/75">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mx-auto max-w-3xl rounded-xl border border-gold/30 bg-gold/[0.06] px-4 py-5 text-center sm:px-7">
        <p className="mx-auto max-w-lg text-xs font-light leading-relaxed text-muted">
          Para elegir el nivel ideal, conocer promociones vigentes o adquirir tu membresía,
          escríbenos por WhatsApp. Te atenderemos con gusto en cualquier sucursal Andreas.
        </p>
        <CustomerServiceWhatsAppButton
          href={buildWhatsAppCustomerUrl('membresias', customerWhatsappContext)}
          className="mt-4"
        />
        <p className="mt-3 text-[9px] text-muted/80">
          Niveles definidos por el salón · canjes y activación en recepción Andreas.
        </p>
      </div>
    </div>
  );
}
