import type { ReactNode } from 'react';

/** Portada editorial: eyebrow + título + copy centrados con imagen sutil de fondo. */
export function HeroCover({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-x-hidden border-b border-border/60 bg-background">
      {/* Móvil: recorte editorial (sin cambios) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[url('/images/hero-salon.png')] bg-cover bg-center bg-no-repeat opacity-[0.44] md:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/55 via-background/82 to-background md:hidden"
      />
      <div
        aria-hidden
        className="glow-gold pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 opacity-40 md:hidden"
      />

      {/* Desktop: portada a ancho completo; marca de agua ~25% menos tenue */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden bg-[url('/images/hero-salon.png')] bg-cover bg-center bg-no-repeat opacity-[0.65] md:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-background/40 via-background/72 to-background md:block"
      />
      <div
        aria-hidden
        className="glow-gold pointer-events-none absolute left-1/2 top-0 hidden h-64 w-64 -translate-x-1/2 opacity-30 md:block"
      />

      <div className="relative mx-auto flex min-h-[52vh] max-w-3xl flex-col items-center justify-center overflow-visible px-4 py-10 text-center sm:min-h-0 sm:px-6 sm:py-14 md:min-h-[72vh] md:max-w-4xl md:items-center md:py-16 md:text-center lg:min-h-[78vh] lg:py-20">
        {children}
      </div>
    </section>
  );
}
