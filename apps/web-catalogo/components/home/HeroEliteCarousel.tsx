'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

const SLIDES = [
  {
    src: '/images/hero-salon.png',
    alt: 'Salón de belleza editorial AppSalon Pro',
    badge: '4.9 · Élite',
    caption: 'Estudio insignia',
    location: 'Cdad. Matriz',
  },
  {
    src: '/images/salon-2.png',
    alt: 'Estilista trabajando en un peinado de autor',
    badge: 'Maestría',
    caption: 'Color de autor',
    location: 'Look premium',
  },
  {
    src: '/images/service-lifting.png',
    alt: 'Tratamiento de mirada y pestañas',
    badge: 'Boutique',
    caption: 'Mirada & pestañas',
    location: 'Tratamiento elite',
  },
] as const;

const INTERVAL_MS = 4500;

export function HeroEliteCarousel() {
  const [active, setActive] = useState(0);
  const n = SLIDES.length;

  useEffect(() => {
    const timer = setInterval(
      () => setActive((prev) => (prev + 1) % n),
      INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [n]);

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="glow-gold pointer-events-none absolute -inset-10 -z-10" />

      <div className="relative aspect-[3/4] w-full">
        {SLIDES.map((slide, i) => {
          const pos = (i - active + n) % n;
          const isFront = pos === 0;
          const isNext = pos === 1;

          return (
            <figure
              key={slide.src}
              className="grain group absolute inset-0 overflow-hidden rounded-[28px] border border-border-strong transition-all duration-700 ease-out"
              style={{
                zIndex: isFront ? 30 : isNext ? 20 : 10,
                opacity: isFront ? 1 : isNext ? 0.72 : 0.45,
                transform: isFront
                  ? 'translateX(0) translateY(0) scale(1)'
                  : isNext
                    ? 'translateX(12%) translateY(4%) scale(0.94)'
                    : 'translateX(-12%) translateY(6%) scale(0.88)',
                pointerEvents: isFront ? 'auto' : 'none',
              }}
            >
              <div className="relative h-full w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <span className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-full border border-border-strong glass px-3.5 py-1.5 text-[10px] font-light uppercase tracking-[0.24em] text-pearl">
                {slide.badge.includes('Élite') && (
                  <Star className="h-3 w-3 text-gold" strokeWidth={1.5} />
                )}
                {slide.badge}
              </span>
              <figcaption className="absolute bottom-5 left-5 right-5 z-10 flex items-center justify-between rounded-2xl border border-border-strong glass px-5 py-3">
                <span className="text-xs font-light uppercase tracking-[0.2em] text-muted">
                  {slide.caption}
                </span>
                <span className="text-xs font-light text-gold">{slide.location}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <div className="mt-5 flex justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`Ver imagen ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? 'w-8 bg-gold' : 'w-1.5 bg-border-strong hover:bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
