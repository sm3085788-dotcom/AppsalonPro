import Link from 'next/link';
import {
  CalendarCheck,
  ShoppingBag,
  Star,
  ShieldCheck,
  ArrowUpRight,
  Zap,
} from 'lucide-react';
import { IphoneMockup } from '@/components/ui/IphoneMockup';
import { AppStoreButtons } from '@/components/site/AppStoreButtons';
import { ServiceCard } from '@/components/catalog/ServiceCard';
import { getServices } from '@/lib/data/catalog';

export default async function HomePage() {
  const services = (await getServices()).slice(0, 3);

  return (
    <div>
      {/* ── Hero editorial ─────────────────────────────── */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="lg:col-span-6">
          <p className="eyebrow">Salón boutique · Belleza de autor</p>
          <h1 className="mt-7 text-balance text-5xl font-light leading-[1.05] tracking-tight text-shine sm:text-6xl lg:text-7xl">
            El ritual de
            <br />
            verse{' '}
            <span className="text-gradient-gold italic">extraordinario</span>
          </h1>
          <p className="mt-8 max-w-md text-pretty text-base font-light leading-relaxed text-muted">
            Un espacio donde el detalle es lujo. Reserva con maestros del estilo,
            descubre productos de culto y vive una experiencia hecha a tu medida.
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
        </div>

        <div className="relative lg:col-span-6">
          <div className="glow-gold pointer-events-none absolute -inset-10 -z-10" />
          <figure className="grain group relative mx-auto max-w-md overflow-hidden rounded-[28px] border border-border-strong">
            <div className="media-3-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/hero-salon.png" alt="Salón de belleza editorial AppSalon Pro" />
            </div>
            {/* Sello editorial superior */}
            <span className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-full border border-border-strong glass px-3.5 py-1.5 text-[10px] font-light uppercase tracking-[0.24em] text-pearl">
              <Star className="h-3 w-3 text-gold" strokeWidth={1.5} /> 4.9 · Élite
            </span>
            <figcaption className="absolute bottom-5 left-5 right-5 z-10 flex items-center justify-between rounded-2xl border border-border-strong glass px-5 py-3">
              <span className="text-xs font-light uppercase tracking-[0.2em] text-muted">
                Estudio insignia
              </span>
              <span className="text-xs font-light text-gold">Cdad. Matriz</span>
            </figcaption>
          </figure>
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
                'Rituales de spa',
                'Barbería premium',
                'Productos de culto',
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
            { k: '12+', v: 'Años de oficio' },
            { k: '40k', v: 'Clientes consentidos' },
            { k: '4.9', v: 'Reseñas verificadas' },
            { k: '8', v: 'Sucursales boutique' },
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

      {/* ── Filosofía / features editoriales (panel claro sutil) ─ */}
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <section className="section-light relative overflow-hidden rounded-[32px] px-6 py-20 sm:px-12 lg:px-16">
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow">La experiencia</p>
              <h2 className="ink mt-5 text-balance text-3xl font-light leading-snug sm:text-4xl">
                Cada visita,
                <br />
                cuidada al detalle
              </h2>
              <p className="ink-soft mt-5 max-w-sm text-sm font-light leading-relaxed">
                Tecnología discreta al servicio de un trato impecable. Así
                acompañamos cada momento de tu ritual.
              </p>
            </div>

            <div className="grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:col-span-8">
              {[
                {
                  icon: CalendarCheck,
                  title: 'Reserva inteligente',
                  desc: 'Eliges sucursal y horario; el salón lo recibe al instante, sin esperas.',
                },
                {
                  icon: ShoppingBag,
                  title: 'Tienda de culto',
                  desc: 'Productos selectos con stock real por sucursal y envío a domicilio.',
                },
                {
                  icon: Star,
                  title: 'Reseñas verificadas',
                  desc: 'Opiniones honestas de clientes con visita o compra confirmada.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Pagos protegidos',
                  desc: 'Checkout cifrado con Stripe. Tu información, siempre resguardada.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="hairline-dark border-t pt-6">
                  <Icon className="h-6 w-6 text-gold" strokeWidth={1.25} />
                  <h3 className="ink mt-5 text-lg font-light">{title}</h3>
                  <p className="ink-soft mt-2 text-sm font-light leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Servicios destacados ───────────────────────── */}
      {services.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mb-12 flex items-end justify-between border-b border-border pb-6">
            <div>
              <p className="eyebrow">Destacados</p>
              <h2 className="mt-3 text-3xl font-light text-cream sm:text-4xl">
                Servicios favoritos
              </h2>
            </div>
            <Link
              href="/servicios"
              className="link-underline hidden text-[13px] font-light uppercase tracking-[0.18em] text-muted hover:text-cream sm:inline"
            >
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </section>
      )}

      {/* ── Ambiente editorial ─────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <figure className="group relative order-2 overflow-hidden rounded-[28px] border border-border lg:order-1 lg:col-span-5">
            <div className="media-3-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/ambiance.png" alt="Interior boutique del salón" />
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
        className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8"
      >
        <div className="relative grid items-center gap-12 overflow-hidden rounded-[32px] border border-border bg-surface p-8 sm:p-14 lg:grid-cols-2">
          <div className="glow-cream pointer-events-none absolute -right-20 -top-20 h-80 w-80" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-gold">
              <Zap className="h-3.5 w-3.5" strokeWidth={1.5} /> App móvil
            </span>
            <h2 className="mt-7 text-balance text-3xl font-light leading-tight text-cream sm:text-4xl">
              Llévate AppSalon Pro contigo
            </h2>
            <p className="mt-5 max-w-md text-sm font-light leading-relaxed text-muted">
              Gestiona tus citas, premios ANDREAS, pedidos y mensajes con el
              salón. Notificaciones en tiempo real y pagos con tarjeta seguros.
            </p>
            <div className="mt-9">
              <AppStoreButtons />
            </div>
          </div>
          <div className="relative flex justify-center">
            <IphoneMockup />
          </div>
        </div>
      </section>
    </div>
  );
}
