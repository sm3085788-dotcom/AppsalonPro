'use client';

import {
  Gem,
  HeartHandshake,
  Sparkles,
  Leaf,
  ShieldCheck,
  CalendarCheck,
  Target,
  Eye,
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
  {
    icon: Target,
    category: 'Misión',
    title: 'Elevar el arte de sentirse bien',
    desc: 'Ofrecer experiencias de belleza excepcionales que combinan la maestría de nuestros estilistas con tecnología que hace de cada visita algo simple, cercano y memorable.',
  },
  {
    icon: Eye,
    category: 'Visión',
    title: 'El salón premium de referencia',
    desc: 'Ser el estándar de la belleza de autor en la región: un espacio donde tradición y modernidad conviven, reconocido por su calidez, su detalle y la confianza de cada cliente.',
  },
];

export function ValuesOrbitSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-4 text-center lg:gap-5">
        <div className="max-w-md">
          <h2 className="text-balance text-2xl font-light text-cream sm:text-3xl">
            Valores, principios, misión y visión
          </h2>
        </div>
        <div className="flex w-full justify-center overflow-visible">
          <ValuesOrbit items={VALUES} />
        </div>
      </div>
    </section>
  );
}
