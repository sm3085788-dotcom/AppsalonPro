import Link from 'next/link';
import {
  Sparkles,
  CalendarCheck,
  ShoppingBag,
  Star,
  ShieldCheck,
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
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-gold">
              <Sparkles className="h-3.5 w-3.5" /> Belleza de lujo
            </span>
            <h1 className="mt-6 text-4xl font-light leading-tight text-cream sm:text-6xl">
              Tu salón premium,
              <br />
              <span className="text-gold">en la palma de tu mano</span>
            </h1>
            <p className="mt-6 max-w-lg text-base font-light leading-relaxed text-muted">
              Reserva citas, compra productos exclusivos y vive una experiencia
              de alta gama. Multi-sucursal, en tiempo real y con pagos seguros.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/reservar"
                className="rounded-full bg-gold px-7 py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-soft"
              >
                Reservar cita
              </Link>
              <Link
                href="/productos"
                className="rounded-full border border-border px-7 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold hover:text-gold"
              >
                Explorar productos
              </Link>
            </div>
          </div>
          <div className="relative">
            <IphoneMockup />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: CalendarCheck,
              title: 'Reserva inteligente',
              desc: 'Elige sucursal y horario; el salón se entera al instante.',
            },
            {
              icon: ShoppingBag,
              title: 'Tienda premium',
              desc: 'Productos con stock real por sucursal y envío a domicilio.',
            },
            {
              icon: Star,
              title: 'Reseñas verificadas',
              desc: 'Opiniones reales de clientes con compra confirmada.',
            },
            {
              icon: ShieldCheck,
              title: 'Pagos seguros',
              desc: 'Checkout cifrado con Stripe. Tu información protegida.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <Icon className="h-7 w-7 text-gold" />
              <h3 className="mt-4 font-medium text-cream">{title}</h3>
              <p className="mt-1 text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Servicios destacados */}
      {services.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gold">
                Destacados
              </p>
              <h2 className="mt-2 text-3xl font-light text-cream">
                Servicios favoritos
              </h2>
            </div>
            <Link
              href="/servicios"
              className="text-sm text-muted hover:text-gold"
            >
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </section>
      )}

      {/* Descarga la app */}
      <section
        id="descargar"
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="grid items-center gap-12 rounded-3xl border border-border bg-surface p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-gold">
              <Zap className="h-3.5 w-3.5" /> App móvil
            </span>
            <h2 className="mt-6 text-3xl font-light leading-tight text-cream sm:text-4xl">
              Llévate AppSalon Pro contigo
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
              Gestiona tus citas, premios ANDREAS, pedidos y mensajes con el
              salón. Notificaciones en tiempo real y pagos con tarjeta seguros.
            </p>
            <div className="mt-8">
              <AppStoreButtons />
            </div>
          </div>
          <div className="flex justify-center">
            <IphoneMockup />
          </div>
        </div>
      </section>
    </div>
  );
}
