import type { ReactNode } from 'react';

/** Portada editorial: eyebrow + título + copy centrados con imagen sutil de fondo. */
export function HeroCover({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[url('/images/hero-salon.png')] bg-cover bg-center opacity-[0.14]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/55 via-background/88 to-background"
      />
      <div
        aria-hidden
        className="glow-gold pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 opacity-40"
      />

      <div className="relative mx-auto flex min-h-[52vh] max-w-3xl flex-col items-center justify-center px-4 py-10 text-center sm:min-h-0 sm:py-14 md:items-start md:py-16 md:text-left lg:py-20">
        {children}
      </div>
    </section>
  );
}
