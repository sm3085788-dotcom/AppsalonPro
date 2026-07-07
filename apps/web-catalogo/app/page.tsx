import Link from 'next/link';
import {
  ArrowUpRight,
  Target,
  Eye,
} from 'lucide-react';
import { ServiceCard } from '@/components/catalog/ServiceCard';
import { HeroCover } from '@/components/home/HeroCover';
import { HeroEliteCarousel } from '@/components/home/HeroEliteCarousel';
import { ValuesOrbitSection } from '@/components/home/ValuesOrbitSection';
import { GiftCardSection } from '@/components/home/GiftCardSection';
import { BrandMarquee } from '@/components/home/BrandMarquee';
import { GoogleReviewsSection } from '@/components/home/GoogleReviewsSection';
import { getGiftCardReviewStatusForPage } from '@/app/gift-card-review/actions';
import { getServices } from '@/lib/data/catalog';
import { getGoogleReviews } from '@/lib/data/googleReviews';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [services, googleReviews, giftReviewStatus] = await Promise.all([
    getServices(),
    getGoogleReviews(),
    getGiftCardReviewStatusForPage(),
  ]);
  const featuredServices = services.slice(0, 4);

  return (
    <div>
      {/* ── Portada + hero ─────────────────────────────── */}
      <HeroCover>
        <p className="eyebrow text-[10px] tracking-[0.18em] sm:text-[11px]">
          Salón premium · Belleza de autor
        </p>
        <div className="mt-3 flex items-center justify-center gap-3 md:mt-5 md:gap-4">
          <span className="rule-gold hidden w-10 sm:block md:hidden" />
          <span className="font-serif text-xl font-medium uppercase tracking-[0.18em] text-gradient-gold sm:text-3xl md:text-[2.7rem]">
            Salón Andreas
          </span>
        </div>
        <h1 className="mt-4 w-full overflow-visible text-3xl font-light leading-[1.14] tracking-tight sm:mt-6 sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="block text-balance text-shine">El arte de</span>
          <span className="mt-0.5 block text-balance">
            <span className="text-shine">verse </span>
            <span className="text-gradient-gold italic">extraordinario</span>
          </span>
        </h1>
        <p className="mt-4 max-w-md text-pretty text-sm font-light leading-relaxed text-muted sm:mt-6 sm:text-base">
          Un espacio donde el detalle es lujo. Reserva con maestros del estilo,
          descubre productos premium y vive una experiencia hecha a tu medida.
        </p>
      </HeroCover>

      <section className="mx-auto grid max-w-7xl items-start gap-8 px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-12 lg:grid-cols-12 lg:items-center lg:gap-8 lg:px-8 lg:pb-28 lg:pt-16">
        <div className="lg:col-span-6">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link
              href="/reservar"
              className="group inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-charcoal transition-colors hover:bg-gold-soft sm:px-8 sm:py-3.5 sm:text-[13px] sm:tracking-[0.18em]"
            >
              Reservar cita
              <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/productos"
              className="link-underline text-[11px] font-light uppercase tracking-[0.16em] text-cream sm:text-[13px] sm:tracking-[0.18em]"
            >
              Explorar la tienda
            </Link>
          </div>

          {featuredServices.length > 0 && (
            <div className="mt-6 sm:mt-10">
              <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted sm:text-[11px] sm:tracking-[0.2em]">
                  Servicios
                </p>
                <Link
                  href="/servicios"
                  className="link-underline text-[10px] font-light uppercase tracking-[0.14em] text-gold sm:text-[11px] sm:tracking-[0.16em]"
                >
                  Ver todos
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:max-w-xl sm:gap-4">
                {featuredServices.map((s) => (
                  <ServiceCard key={s.id} service={s} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative flex justify-center lg:col-span-6 lg:items-center lg:self-stretch">
          <HeroEliteCarousel />
        </div>
      </section>

      {/* ── Marquee marcas premium ─────────────────────── */}
      <BrandMarquee />

      {/* ── Cifras / confianza ─────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-24 lg:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:rounded-2xl lg:grid-cols-4">
          {[
            { k: '19+', v: 'Años de oficio', color: '#f5ead2' },
            { k: '25k', v: 'Clientes consentidos', color: '#f0e0dc' },
            { k: '4.9', v: 'Reseñas verificadas', color: '#dcebe4' },
            { k: '1', v: 'Sucursal · 3 en proceso', color: '#dfe6f2' },
          ].map(({ k, v, color }) => (
            <div
              key={v}
              className="group bg-background px-4 py-6 text-center transition-colors hover:bg-surface sm:px-6 sm:py-9"
            >
              <p
                className="text-2xl font-light transition-opacity group-hover:opacity-90 sm:text-4xl"
                style={{ color }}
              >
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

          <figure className="group relative overflow-hidden rounded-[24px] border border-border">
            <div className="media-3-4 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/salon-5.png"
                alt="Detalle de productos premium del salón"
                className="transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
          </figure>

          <figure className="group relative overflow-hidden rounded-[24px] border border-border">
            <div className="media-3-4 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/salon-6.png"
                alt="Cabina privada de tratamiento especializado"
                className="transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
          </figure>
        </div>
      </section>

      {/* ── Misión & Visión ────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto grid max-w-4xl gap-5 lg:max-w-none lg:grid-cols-2 lg:gap-6">
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
              className="ring-gold-hover relative overflow-hidden rounded-[24px] border border-border bg-surface p-6 sm:p-8"
            >
              <div className="glow-gold pointer-events-none absolute -right-14 -top-14 h-44 w-44 opacity-60" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-gold sm:px-3.5 sm:py-1.5 sm:text-[11px] sm:tracking-[0.25em]">
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={1.5} /> {tag}
              </span>
              <h3 className="mt-5 text-balance text-xl font-light leading-snug text-cream sm:mt-6 sm:text-2xl">
                {title}
              </h3>
              <p className="mt-3 max-w-sm text-xs font-light leading-relaxed text-muted sm:mt-4 sm:max-w-md sm:text-sm">
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
          <figure className="group relative order-2 mx-auto w-[85%] overflow-hidden rounded-[24px] border border-border lg:order-1 lg:col-span-5 lg:max-w-[85%]">
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

      <GoogleReviewsSection data={googleReviews} giftReviewStatus={giftReviewStatus} />
    </div>
  );
}
