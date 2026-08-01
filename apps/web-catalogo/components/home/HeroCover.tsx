import type { ReactNode } from 'react';

/** Bump when replacing `public/images/hero-salon.png` so browsers refetch the asset. */
const HERO_BG =
  "bg-[url('/images/hero-salon.png?v=20260731')] bg-cover bg-no-repeat";

/** Portada editorial: fondo a ancho completo (sin bandas), copy centrado. */
export function HeroCover({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-x-hidden border-b border-border/60 bg-background">
      {/* Móvil: encuadre un poco más bajo para el ramo */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${HERO_BG} bg-[62%_44%] opacity-[0.70] md:hidden`}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/24 via-background/50 to-background/76 md:hidden"
      />
      <div
        aria-hidden
        className="glow-gold pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 opacity-40 md:hidden"
      />

      {/* Desktop */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 hidden ${HERO_BG} bg-[66%_46%] opacity-[0.92] md:block`}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-background/14 via-background/36 to-background/64 md:block"
      />
      <div
        aria-hidden
        className="glow-gold pointer-events-none absolute left-1/2 top-0 hidden h-64 w-64 -translate-x-1/2 opacity-30 md:block"
      />

      <div className="relative z-[1] mx-auto flex min-h-[59vh] max-w-3xl flex-col items-center justify-center overflow-visible px-4 pt-10 pb-12 text-center sm:min-h-[59vh] sm:px-6 sm:pt-14 sm:pb-16 md:min-h-[81vh] md:max-w-4xl md:items-center md:pt-16 md:pb-[4.5rem] md:text-center lg:min-h-[88vh] lg:pt-20 lg:pb-24">
        {children}
      </div>
    </section>
  );
}
