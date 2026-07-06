'use client';

import {
  Gem,
  HeartHandshake,
  Sparkles,
  Leaf,
  ShieldCheck,
  CalendarCheck,
} from 'lucide-react';
import { ValuesOrbit, type ValueItem } from './ValuesOrbit';

const VALUES: ValueItem[] = [
  {
    icon: Gem,
    title: 'Excelencia',
    desc: 'Detalle impecable en cada servicio, sin atajos.',
  },
  {
    icon: HeartHandshake,
    title: 'Cercanía',
    desc: 'Escuchamos primero. Calidez y honestidad.',
  },
  {
    icon: Sparkles,
    title: 'Creatividad',
    desc: 'Looks únicos, fieles a tu esencia.',
  },
  {
    icon: Leaf,
    title: 'Cuidado consciente',
    desc: 'Productos de calidad y prácticas responsables.',
  },
  {
    icon: ShieldCheck,
    title: 'Confianza',
    desc: 'Precios claros y pagos protegidos.',
  },
  {
    icon: CalendarCheck,
    title: 'Compromiso',
    desc: 'Puntualidad y palabra cumplida.',
  },
];

export function ValuesOrbitSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-8 text-center lg:gap-10">
        <div className="max-w-md">
          <h2 className="text-balance text-2xl font-light text-cream sm:text-3xl">
            Valores &amp; principios
          </h2>
          <p className="mt-3 text-sm font-light leading-relaxed text-muted">
            Un círculo virtuoso: cada valor refuerza al siguiente en cada visita,
            en cada conversación y en cada detalle de nuestro oficio.
          </p>
        </div>
        <div className="flex w-full justify-center overflow-visible">
          <ValuesOrbit items={VALUES} />
        </div>
      </div>
    </section>
  );
}
