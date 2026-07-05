import Link from 'next/link';
import {
  ArrowUpRight,
  Zap,
  Target,
  Eye,
} from 'lucide-react';
import { IphoneMockup } from '@/components/ui/IphoneMockup';
import { AppStoreButtons } from '@/components/site/AppStoreButtons';
import { ServiceCard } from '@/components/catalog/ServiceCard';
import { HeroEliteCarousel } from '@/components/home/HeroEliteCarousel';
import { ValuesOrbitSection } from '@/components/home/ValuesOrbitSection';
import { GiftCardSection } from '@/components/home/GiftCardSection';
import { getServices } from '@/lib/data/catalog';

export default async function HomePage() {
  const services = (await getServices()).slice(0, 4);

  return (
    <div>
      {/* ── Hero editorial ─────────────────────────────── */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="lg:col-span-6">
          <p className="eyebrow">Salón premium · Belleza de autor</p>
          <div className="mt-5 flex items-center gap-4">
            <span className="rule-gold hidden w-12 sm:block" />
            <span className="font-serif text-3xl font-medium uppercase tracking-[0.22em] text-gradient-gold sm:text-4xl">
              Salón Andreas
            </span>
          </div>
          <h1 className="mt-6 text-balance text-5xl font-light leading-[1.05] tracking-tight text-shine sm:text-6xl lg:text-7xl">
            El arte de
            <br />
            verse{' '}
            <span className="text-gradient-gold italic">extraordinario</span>
          </h1>
          <p className="mt-8 max-w-md text-pretty text-base font-light leading-relaxed text-muted">
            Un espacio donde el detalle es lujo. Reserva con maestros del estilo,
            descubre productos premium y vive una experiencia hecha a tu medida.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              href="/reservar"
              className="group inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3.5 text-[13px] font-medium uppercase tracking-[0.18em] text-charcoal transition-colors hover:bg-gold-soft"
            >
              Reservar cita
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/productos"
              className="link-underline text-[13px] font-light uppercase tracking-[0.18em] text-cream"
            >
              Explorar la tienda
            </Link>
          </div>

          {services.length > 0 && (
            <div className="mt-10">
              <div className="mb-4 flex items-end justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                  Servicios
                </p>
                <Link
                  href="/servicios"
                  className="link-underline text-[11px] font-light uppercase tracking-[0.16em] text-gold"
                >
                  Ver todos
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:max-w-xl sm:gap-4">
                {services.map((s) => (
                  <ServiceCard key={s.id} service={s} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative lg:col-span-6">
          <HeroEliteCarousel />
        </div>
      </section>

      {/* ── Marquee editorial ──────────────────────────── */}
      <section className="relative overflow-hidden border-y border-border py-5">
        <div className="marquee gap-10">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex shrink-0 items-center gap-10 pr-10">
              {[
                'Color de autor',
                'Cortes de precisión',
                'Tratamientos de spa',
                'Barbería premium',
                'Productos premium',
                'Novias & eventos',
              ].map((word) => (
                <span
                  key={word}
                  className="flex items-center gap-10 text-lg font-light uppercase tracking-[0.22em] text-pearl-dim"
                >
                  {word}
                  <span className="h-1 w-1 rounded-full bg-gold" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Cifras / confianza ─────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
          {[
            { k: '19+', v: 'Años de oficio' },
            { k: '25k', v: 'Clientes consentidos' },
            { k: '4.9', v: 'Reseñas verificadas' },
            { k: '1', v: 'Sucursal · 3 en proceso' },
          ].map(({ k, v }) => (
            <div
              key={v}
              className="group bg-background px-6 py-9 text-center transition-colors hover:bg-surface"
            >
              <p className="text-4xl font-light text-pearl transition-colors group-hover:text-gold">
                {k}
              </p>
              <p className="mt-2 text-xs font-light uppercase tracking-[0.2em] text-muted">
                {v}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Galería del salón ──────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-28 sm:px-6 lg:px-8">
        <div className="mb-12 flex items-end justify-between border-b border-border pb-6">
          <div>
            <p className="eyebrow">El salón</p>
            <h2 className="mt-3 text-balance text-3xl font-light text-cream sm:text-4xl">
              Nuestro mundo en imágenes
            </h2>
          </div>
          <Link
            href="/servicios"
            className="link-underline hidden text-[13px] font-light uppercase tracking-[0.18em] text-muted hover:text-cream sm:inline"
          >
            Agenda tu visita
          </Link>
        </div>

        {/* Mosaico editorial: mezcla de retrato y paisaje */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          <figure className="group relative col-span-2 overflow-hidden rounded-[24px] border border-border">
            <div className="aspect-[16/10] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/salon-1.png"
                alt="Interior del salón premium con estaciones de estilismo"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
            <figcaption className="absolute bottom-4 left-4 rounded-full border border-border-strong glass px-4 py-1.5 text-[11px] font-light uppercase tracking-[0.2em] text-pearl">
              Estudio insignia
            </figcaption>
          </figure>

          <figure className="group relative overflow-hidden rounded-[24px] border border-border">
            <div className="media-3-4 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/salon-2.png"
                alt="Estilista trabajando en un peinado de autor"
                className="transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
          </figure>

          <figure className="group relative overflow-hidden rounded-[24px] border border-border">
            <div className="media-3-4 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/salon-3.png"
                alt="Recepción del salón con productos en exhibición"
                className="transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
          </figure>

          <figure className="group relative col-span-2 overflow-hidden rounded-[24px] border border-border">
            <div className="aspect-[16/10] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/salon-4.png"
                alt="Sala de tratamientos de spa del salón"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
            <figcaption className="absolute bottom-4 left-4 rounded-full border border-border-strong glass px-4 py-1.5 text-[11px] font-light uppercase tracking-[0.2em] text-pearl">
              Tratamiento de spa
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── Misión & Visión ────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-28 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {[
            {
              icon: Target,
              tag: 'Misión',
              title: 'Elevar el arte de sentirse bien',
              desc: 'Ofrecer experiencias de belleza excepcionales que combinan la maestría de nuestros estilistas con tecnología que hace de cada visita algo simple, cercano y memorable.',
            },
            {
              icon: Eye,
              tag: 'Visión',
              title: 'El salón premium de referencia',
              desc: 'Ser el estándar de la belleza de autor en la región: un espacio donde tradición y modernidad conviven, reconocido por su calidez, su detalle y la confianza de cada cliente.',
            },
          ].map(({ icon: Icon, tag, title, desc }) => (
            <article
              key={tag}
              className="ring-gold-hover relative overflow-hidden rounded-[28px] border border-border bg-surface p-8 sm:p-10"
            >
              <div className="glow-gold pointer-events-none absolute -right-16 -top-16 h-52 w-52 opacity-60" />
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] text-gold">
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} /> {tag}
              </span>
              <h3 className="mt-6 text-balance text-2xl font-light leading-snug text-cream sm:text-3xl">
                {title}
              </h3>
              <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-muted">
                {desc}
              </p>
            </article>
          ))}
        </div>
      </section>

      <ValuesOrbitSection />

      {/* ── Tarjeta de regalo recargable ─────────────── */}
      <GiftCardSection />

      {/* ── Ambiente editorial ─────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <figure className="group relative order-2 overflow-hidden rounded-[28px] border border-border lg:order-1 lg:col-span-5">
            <div className="media-3-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/ambiance.png" alt="Interior premium del salón" />
            </div>
          </figure>
          <div className="order-1 lg:order-2 lg:col-span-7">
            <p className="eyebrow">El espacio</p>
            <h2 className="mt-5 text-balance text-3xl font-light leading-snug text-cream sm:text-4xl lg:text-5xl">
              Un refugio diseñado para
              <span className="text-gold"> sentirte en casa</span>
            </h2>
            <p className="mt-6 max-w-lg text-base font-light leading-relaxed text-muted">
              Latón cálido, mármol crema y luz tenue. Cada sucursal comparte un
              mismo lenguaje de calma y precisión, para que el único protagonista
              seas tú.
            </p>
            <Link
              href="/servicios"
              className="link-underline mt-8 inline-block text-[13px] font-light uppercase tracking-[0.18em] text-cream"
            >
              Descubre el catálogo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Descarga la app ────────────────────────────── */}
      <section
        id="descargar"
        className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 lg:px-8"
      >
        <div className="relative overflow-hidden rounded-[32px] border border-border bg-surface p-6 sm:p-10">
          <div className="glow-cream pointer-events-none absolute -right-20 -top-20 h-80 w-80" />
          <div className="glow-gold pointer-events-none absolute -left-20 bottom-0 h-72 w-72 opacity-60" />

          <div className="relative grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-gold">
                <Zap className="h-3.5 w-3.5" strokeWidth={1.5} /> App móvil
              </span>
              <h2 className="mt-7 text-balance text-3xl font-light leading-tight text-cream sm:text-4xl">
                Llévate AppSalon Pro contigo
              </h2>
              <p className="mt-5 max-w-md text-sm font-light leading-relaxed text-muted">
                Gestiona tus citas, premios ANDREAS, pedidos y mensajes con el
                salón. Explora servicios y tienda, descubre Tendencias con looks
                e inspiración del salón en video, y recibe notificaciones en
                tiempo real con pagos con tarjeta seguros.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  'Reserva y reprograma en segundos',
                  'Tienda con stock real por sucursal',
                  'Premios ANDREAS y seguimiento de pedidos',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm font-light text-pearl-dim"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-9">
                <AppStoreButtons />
              </div>
            </div>

            {/* Trío de teléfonos con distintas pantallas (abanico contenido) */}
            <div className="relative flex items-center justify-center py-4">
              <IphoneMockup
                src="/images/app-servicios.png"
                alt="Pantalla de servicios de la app AppSalon Pro"
                size="sm"
                className="hidden -mr-16 translate-y-8 -rotate-6 opacity-90 lg:block"
              />
              <IphoneMockup
                src="/images/app-home.png"
                alt="Pantalla principal de la app AppSalon Pro"
                size="lg"
                className="relative z-10"
              />
              <IphoneMockup
                src="/images/app-producto.png"
                alt="Pantalla de producto de la app AppSalon Pro"
                size="sm"
                className="hidden -ml-16 translate-y-8 rotate-6 opacity-90 lg:block"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
