'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ValueItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const ROTATE_MS = 3800;

/** Valores en anillo con carrusel: el activo avanza al frente con profundidad. */
export function ValuesOrbit({ items }: { items: ValueItem[] }) {
  const n = items.length;
  const radius = 42;
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setActive((prev) => (prev + 1) % n),
      ROTATE_MS,
    );
    return () => clearInterval(timer);
  }, [n]);

  return (
    <div className="values-orbit relative mx-auto aspect-square w-full max-w-[min(100%,22rem)] overflow-visible sm:max-w-md">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[12%] rounded-full border border-gold/15 bg-gradient-to-b from-surface/80 to-background shadow-[inset_0_0_40px_rgba(212,175,55,0.06)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[22%] rounded-full border border-border/80"
      />
      <div
        aria-hidden
        className="values-orbit-ring pointer-events-none absolute inset-[32%] rounded-full border border-dashed border-gold/10"
      />

      <div className="absolute inset-0 origin-center md:scale-[1.3]">
        <div className="absolute left-1/2 top-1/2 z-10 w-[44%] -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="eyebrow text-[10px] sm:text-[11px]">Lo que nos mueve</p>
          <p className="mt-1 font-serif text-lg font-medium leading-tight text-gradient-gold sm:text-xl">
            Valores
          </p>
          <p className="mt-2 line-clamp-2 min-h-[2.25rem] text-[10px] font-light leading-snug text-muted transition-opacity duration-500 sm:text-xs">
            {items[active]?.desc}
          </p>
        </div>

        {items.map((item, i) => {
          const pos = (i - active + n) % n;
          const angle = (360 / n) * pos + 90;
          const isFront = pos === 0;
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              className="values-orbit-node absolute left-1/2 top-1/2 w-[38%] max-w-[9.5rem] transition-all duration-700 ease-out sm:max-w-[10.5rem]"
              style={{
                zIndex: isFront ? 30 : 20 - pos,
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}%) rotate(${-angle}deg) scale(${isFront ? 1.1 : 0.88})`,
                opacity: isFront ? 1 : pos === 1 ? 0.82 : 0.58,
              }}
            >
              <div
                className={`rounded-2xl border bg-surface/95 p-2.5 backdrop-blur-sm transition-colors duration-500 sm:p-3 ${
                  isFront
                    ? 'border-gold/40 shadow-[0_16px_40px_-12px_rgba(212,175,55,0.45),0_0_0_1px_rgba(212,175,55,0.2)]'
                    : 'border-border shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55)]'
                }`}
              >
                <Icon className="h-4 w-4 text-gold sm:h-[18px] sm:w-[18px]" strokeWidth={1.25} />
                <h3 className="mt-1.5 text-[11px] font-light leading-tight text-cream sm:text-xs">
                  {item.title}
                </h3>
                <p
                  className={`mt-1 line-clamp-2 text-[9px] font-light leading-snug sm:text-[10px] ${
                    isFront ? 'text-pearl-dim' : 'text-muted'
                  }`}
                >
                  {item.desc}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
